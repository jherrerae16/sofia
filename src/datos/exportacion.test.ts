import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote, registrarSalida } from './animales'
import { prisma } from './cliente'
import { anularAplicacion, registrarEvento, ultimasAplicaciones } from './sanidad'
import { datosExportacionCompleta } from './exportacion'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { crearLote } from './lotes'
import { moverLote } from './movimientos'
import { anularNovedad, registrarHecho, registrarSuministro } from './novedades'
import { anularPesaje, guardarPesaje } from './pesajes'
import { crearPotrero } from './potreros'
import { guardarParametro } from './parametros'

let loteId: string
let potreroId: string
let otroPotreroId: string

beforeEach(async () => {
  await limpiarTablasOperativas()
  await prisma.parametro.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.finca.deleteMany()

  await prisma.usuario.create({
    data: { id: 'u1', nombre: 'Joseph', correo: 'joseph@ejemplo.com', claveHash: 'x' },
  })
  await prisma.finca.create({ data: { nombre: 'Santa Verónica' } })

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-01-01' })
  potreroId = await crearPotrero({
    nombre: 'El Jobo',
    hectareas: 5,
    capacidadKg: 5000,
    tipoPasto: 'Brachiaria',
    tieneAgua: true,
  })
  otroPotreroId = await crearPotrero({
    nombre: 'La Loma',
    hectareas: 3,
    capacidadKg: 3000,
    tipoPasto: null,
    tieneAgua: false,
  })
})

// El respaldo tiene que ver TODO -- lo anulado, lo cerrado, lo que ya salió
// de la finca -- porque la plataforma nunca borra nada y el archivo tiene
// que honrar esa regla, no filtrarla en silencio.
describe('datosExportacionCompleta', () => {
  it('trae los animales activos y los que ya salieron, con el nombre del lote resuelto', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['001', '002'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: 'Finca Vecina',
      fechaEntrada: '2026-01-05',
      edadEntradaMeses: 8,
      pesos: { '001': 180.5, '002': 175 },
    })
    await registrarSalida(
      {
        animalIds: [(await prisma.animal.findFirstOrThrow({ where: { chapeta: '001' } })).id],
        estado: 'vendido',
        fechaSalida: '2026-06-01',
        motivoSalida: null,
        pesosSalida: {},
      },
      '2026-06-01',
    )

    const datos = await datosExportacionCompleta()
    expect(datos.animales).toHaveLength(2)

    const vendido = datos.animales.find((a) => a.chapeta === '001')!
    expect(vendido.estado).toBe('Vendido')
    expect(vendido.lote).toBe('Ceba 01')
    expect(vendido.fechaSalida).toBe('2026-06-01')
    expect(vendido.pesoEntradaKg).toBe(180.5)
    expect(typeof vendido.pesoEntradaKg).toBe('number')

    const activo = datos.animales.find((a) => a.chapeta === '002')!
    expect(activo.estado).toBe('Activo')
    expect(activo.fechaSalida).toBeNull()
  })

  it('trae los pesajes con la chapeta y el lote del animal, e incluye los anulados con su motivo', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['010'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-01-05',
      edadEntradaMeses: null,
      pesos: { '010': 200 },
    })
    const animal = await prisma.animal.findFirstOrThrow({ where: { chapeta: '010' } })

    const pesajeId = await guardarPesaje(
      {
        fecha: '2026-02-01',
        metodo: 'bascula',
        responsable: 'Pedro',
        notas: 'Pesaje de control',
        registradoPorId: 'u1',
        mediciones: [{ animalId: animal.id, pesoKg: 220 }],
      },
      '2026-02-01',
    )
    await anularPesaje(pesajeId, 'Báscula descalibrada', 'u1')

    const datos = await datosExportacionCompleta()
    expect(datos.pesajes).toHaveLength(1)
    const fila = datos.pesajes[0]
    expect(fila.chapeta).toBe('010')
    expect(fila.lote).toBe('Ceba 01')
    expect(fila.pesoKg).toBe(220)
    expect(typeof fila.pesoKg).toBe('number')
    expect(fila.metodo).toBe('báscula')
    expect(fila.registradoPor).toBe('Joseph')
    expect(fila.anuladoEn).not.toBeNull()
    expect(fila.motivoAnulacion).toBe('Báscula descalibrada')
    expect(fila.anuladoPor).toBe('Joseph')
  })

  it('trae los lotes cerrados igual que los abiertos, con el potrero actual resuelto', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroId, fecha: '2026-01-10', registradoPorId: 'u1' })
    await prisma.lote.update({ where: { id: loteId }, data: { fechaCierre: new Date('2026-07-01T00:00:00.000Z') } })

    const datos = await datosExportacionCompleta()
    const fila = datos.lotes.find((l) => l.nombre === 'Ceba 01')!
    expect(fila.fechaCierre).toBe('2026-07-01')
    expect(fila.potreroActual).toBe('El Jobo')
  })

  it('trae los potreros anulados igual que los vigentes', async () => {
    await prisma.potrero.update({
      where: { id: otroPotreroId },
      data: { anuladoEn: new Date('2026-03-01T00:00:00.000Z'), motivoAnulacion: 'Se vendió el lote de tierra' },
    })

    const datos = await datosExportacionCompleta()
    expect(datos.potreros).toHaveLength(2)
    const anulado = datos.potreros.find((p) => p.nombre === 'La Loma')!
    expect(anulado.anuladoEn).not.toBeNull()
    expect(anulado.motivoAnulacion).toBe('Se vendió el lote de tierra')
    expect(anulado.tieneAgua).toBe(false)
    expect(anulado.hectareas).toBe(3)
    expect(typeof anulado.hectareas).toBe('number')
  })

  it('trae los movimientos con los nombres de los potreros de origen y destino', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroId, fecha: '2026-01-10', registradoPorId: 'u1' })
    await moverLote({ loteId, potreroDestinoId: otroPotreroId, fecha: '2026-02-10', registradoPorId: 'u1' })

    const datos = await datosExportacionCompleta()
    expect(datos.movimientos).toHaveLength(2)
    const segundo = datos.movimientos.find((m) => m.fecha === '2026-02-10')!
    expect(segundo.potreroOrigen).toBe('El Jobo')
    expect(segundo.potreroDestino).toBe('La Loma')
    expect(segundo.lote).toBe('Ceba 01')
  })

  it('trae las novedades vigentes, las cerradas y las anuladas', async () => {
    await registrarHecho(
      { fecha: '2026-01-15', descripcion: 'Se arregló el bebedero', loteId: null, potreroId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    const suministroId = await registrarSuministro(
      { fechaInicio: '2026-01-20', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await anularNovedad(suministroId, 'Se digitó en el lote equivocado', 'u1')

    const datos = await datosExportacionCompleta()
    expect(datos.novedades).toHaveLength(2)
    const anulada = datos.novedades.find((n) => n.descripcion === 'Sal a voluntad')!
    expect(anulada.tipo).toBe('Suministro en curso')
    expect(anulada.anuladoEn).not.toBeNull()
    expect(anulada.motivoAnulacion).toBe('Se digitó en el lote equivocado')
    expect(anulada.lote).toBe('Ceba 01')
  })

  // La chapeta solo es única entre los animales ACTIVOS (índice único
  // parcial, ver la migración 20260822225112_chapeta_unica_por_activo): con
  // dos ciclos de ceba al año, una chapeta reutilizada pertenece a dos
  // animales distintos. La columna `lote` de un evento es la del EVENTO (va
  // vacía cuando el evento se aplicó a un animal puntual), no la del
  // animal -- así que sin una columna aparte con el lote del animal, un
  // veterinario que lea el respaldo no puede saber a cuál de los dos
  // animales con "Chapeta 101" se le aplicó cada evento.
  it('trae, para cada evento de un animal puntual, el lote del ANIMAL además del lote del evento -- para distinguir chapetas reutilizadas entre ciclos', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['101'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-01-05',
      edadEntradaMeses: null,
      pesos: { '101': 200 },
    })
    const animalCicloUno = await prisma.animal.findFirstOrThrow({ where: { chapeta: '101' } })
    await registrarEvento({
      tipo: 'vitamina',
      fecha: '2026-01-10',
      producto: 'Complejo B',
      dosis: '10ml',
      responsable: 'Vet. Gómez',
      proximaFecha: null,
      notas: null,
      animalId: animalCicloUno.id,
      loteId: null,
      registradoPorId: 'u1',
    })
    // La chapeta 101 sale de la finca -- queda libre para el próximo ciclo.
    await registrarSalida(
      { animalIds: [animalCicloUno.id], estado: 'vendido', fechaSalida: '2026-06-01', motivoSalida: null, pesosSalida: {} },
      '2026-06-01',
    )

    const loteDosId = await crearLote({ nombre: 'Ceba 02', tipo: 'ceba', fechaApertura: '2026-07-01' })
    await crearAnimales({
      loteId: loteDosId,
      chapetas: ['101'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-07-05',
      edadEntradaMeses: null,
      pesos: { '101': 190 },
    })
    const animalCicloDos = await prisma.animal.findFirstOrThrow({ where: { chapeta: '101', loteId: loteDosId } })
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-07-10',
      producto: 'Ivermectina',
      dosis: '5ml',
      responsable: 'Vet. Gómez',
      proximaFecha: null,
      notas: null,
      animalId: animalCicloDos.id,
      loteId: null,
      registradoPorId: 'u1',
    })

    const datos = await datosExportacionCompleta()
    const eventosChapeta101 = datos.eventos.filter((e) => e.chapeta === '101')
    expect(eventosChapeta101).toHaveLength(2)

    const vitamina = eventosChapeta101.find((e) => e.tipo === 'Vitamina')!
    expect(vitamina.loteAnimal).toBe('Ceba 01')
    expect(vitamina.lote).toBeNull() // lote DEL EVENTO: vacío porque este evento se aplicó al animal, no al lote

    const desparasitacion = eventosChapeta101.find((e) => e.tipo === 'Desparasitación')!
    expect(desparasitacion.loteAnimal).toBe('Ceba 02')
    expect(desparasitacion.lote).toBeNull()

    // Sin la columna aparte, las dos filas serían indistinguibles.
    expect(vitamina.loteAnimal).not.toBe(desparasitacion.loteAnimal)
  })

  it('trae los eventos sanitarios con la chapeta y el lote resueltos', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['020'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-01-05',
      edadEntradaMeses: null,
      pesos: { '020': 190 },
    })
    const animal = await prisma.animal.findFirstOrThrow({ where: { chapeta: '020' } })
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-02-01',
      producto: 'Triple viral',
      dosis: '5ml',
      responsable: 'Vet. Gómez',
      proximaFecha: '2026-08-01',
      notas: null,
      animalId: animal.id,
      loteId: null,
      registradoPorId: 'u1',
    })

    const datos = await datosExportacionCompleta()
    expect(datos.eventos).toHaveLength(1)
    expect(datos.eventos[0].chapeta).toBe('020')
    expect(datos.eventos[0].lote).toBeNull()
    expect(datos.eventos[0].tipo).toBe('Vacuna')
  })

  it('trae todo el histórico de parámetros, con el valor numérico convertido y el autor resuelto', async () => {
    await guardarParametro('gdp_objetivo', '400', '2026-01-01', 'u1')
    await guardarParametro('gdp_objetivo', '450', '2026-06-01', 'u1')

    const datos = await datosExportacionCompleta()
    expect(datos.parametros).toHaveLength(2)
    const primero = datos.parametros.find((p) => p.vigenteDesde === '2026-01-01')!
    expect(primero.valor).toBe(400)
    expect(typeof primero.valor).toBe('number')
    expect(primero.creadoPor).toBe('Joseph')
  })

  it('un valor de parámetro no numérico se conserva como texto, no se inventa un número', async () => {
    await guardarParametro('gdp_objetivo', 'seiscientos', '2026-01-01', 'u1')

    const datos = await datosExportacionCompleta()
    expect(datos.parametros[0].valor).toBe('seiscientos')
  })

  // El nombre de la finca y el momento de la exportación son lo que la
  // portada del archivo necesita para explicarse sola -- ver
  // src/app/exportar/construirLibro.ts.
  it('trae el nombre de la finca y el momento exacto de la exportación', async () => {
    const antes = new Date()
    const datos = await datosExportacionCompleta()
    const despues = new Date()

    expect(datos.finca).toEqual({ nombre: 'Santa Verónica' })
    expect(datos.exportadoEn.getTime()).toBeGreaterThanOrEqual(antes.getTime())
    expect(datos.exportadoEn.getTime()).toBeLessThanOrEqual(despues.getTime())
  })

  it('trae null como finca cuando todavía no se ha creado ninguna', async () => {
    await prisma.finca.deleteMany()
    const datos = await datosExportacionCompleta()
    expect(datos.finca).toBeNull()
  })
})

describe('el respaldo no miente por omisión sobre la sanidad anulada', () => {
  it('una aplicación anulada sigue en el respaldo, con su motivo y quién la anuló', async () => {
    const loteId = await crearLote({
      nombre: 'Ceba Anulada',
      tipo: 'ceba',
      fechaApertura: '2026-09-01',
    })
    await crearAnimales({
      loteId,
      chapetas: ['777'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '777': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id

    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-05',
      producto: 'Aftosa',
      dosis: '2 ml',
      responsable: 'Joseph',
      proximaFecha: null,
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })
    const [aplicacion] = await ultimasAplicaciones(loteId, '2026-09-20')
    await anularAplicacion(aplicacion.animalIds, aplicacion.claveTanda, 'Dedazo del producto', 'u1')

    const datos = await datosExportacionCompleta()
    const fila = datos.eventos.find((evento) => evento.chapeta === '777')!

    // El respaldo incluye lo anulado a propósito, igual que con los pesajes y
    // las novedades: si desapareciera, el archivo diría que esa vacuna nunca
    // se anotó, y quien lo lea no sabrá que hubo una corrección.
    expect(fila).toBeDefined()
    expect(fila.anuladoEn).not.toBeNull()
    expect(fila.motivoAnulacion).toBe('Dedazo del producto')
    expect(fila.anuladoPor).not.toBeNull()
  })
})
