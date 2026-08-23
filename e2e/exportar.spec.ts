import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { crearAnimales, registrarSalida } from '../src/datos/animales'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { prisma } from '../src/datos/cliente'
import { crearLote } from '../src/datos/lotes'
import { moverLote } from '../src/datos/movimientos'
import { cerrarSuministro, registrarHecho, registrarSuministro } from '../src/datos/novedades'
import { anularPesaje, guardarPesaje } from '../src/datos/pesajes'
import { crearPotrero } from '../src/datos/potreros'
import { registrarEvento } from '../src/datos/sanidad'
import { excelSerialAFechaISO, filaComoObjeto, leerXlsx, type HojaLeida } from './xlsxReader'

// Mismo motivo que en las demás pruebas de navegador: fechas relativas a
// hoy, no fijas -- así la ventana entrada/pesaje/salida nunca caduca.
const HOY = hoyBogota()
const FECHA_ENTRADA = sumarDias(HOY, -90)

// Nombres propios, distintos de todo lo que siembra `e2e/preparar.ts` o
// cualquier otra prueba: la exportación lee TODA la base sin filtrar nada
// (es justo lo que existe para verificar), así que esta prueba no puede
// contar filas totales -- otro archivo de prueba pudo dejar las suyas. En
// cambio sí puede filtrar con certeza por estos nombres, sean cuales sean
// los datos que ya había antes.
const NOMBRE_LOTE = 'Ceba Exportar E2E'
const NOMBRE_POTRERO_NORTE = 'Potrero Exportar Norte'
const NOMBRE_POTRERO_SUR = 'Potrero Exportar Sur'

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function iniciarSesion(page: import('@playwright/test').Page) {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  await page.waitForURL((url) => url.pathname === '/')
}

/** Encuentra la hoja por nombre y falla con un mensaje claro si no está -- en vez de un `undefined` silencioso más abajo. */
function hojaOFalla(hojas: HojaLeida[], nombre: string): HojaLeida {
  const hoja = hojas.find((h) => h.nombre === nombre)
  if (!hoja) throw new Error(`El archivo no trae la hoja "${nombre}". Hojas presentes: ${hojas.map((h) => h.nombre).join(', ')}`)
  return hoja
}

function filasComoObjetos(hoja: HojaLeida) {
  return hoja.filas.map((fila) => filaComoObjeto(hoja, fila))
}

test.beforeAll(async () => {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'joseph@ejemplo.com' } })

  const loteId = await crearLote({ nombre: NOMBRE_LOTE, tipo: 'ceba', fechaApertura: FECHA_ENTRADA })
  const potreroNorteId = await crearPotrero({
    nombre: NOMBRE_POTRERO_NORTE,
    hectareas: 8.25,
    capacidadKg: 6000,
    tipoPasto: 'Brachiaria',
    tieneAgua: true,
  })
  const potreroSurId = await crearPotrero({
    nombre: NOMBRE_POTRERO_SUR,
    hectareas: 4,
    capacidadKg: 3000,
    tipoPasto: null,
    tieneAgua: false,
  })

  // Cuatro animales: dos siguen activos, uno se vendió y uno murió -- las
  // tres situaciones que un respaldo tiene que conservar por igual.
  await crearAnimales({
    loteId,
    chapetas: ['9001', '9002', '9003', '9004'],
    sexo: 'macho',
    raza: 'Brahman',
    cruce: null,
    proveedor: 'Finca Vecina',
    fechaEntrada: FECHA_ENTRADA,
    edadEntradaMeses: 8,
    pesos: { '9001': 180, '9002': 190, '9003': 175, '9004': 200 },
  })
  const animales = await prisma.animal.findMany({ where: { loteId }, orderBy: { chapeta: 'asc' } })
  const idPorChapeta = new Map(animales.map((a) => [a.chapeta, a.id]))

  await registrarSalida(
    {
      animalIds: [idPorChapeta.get('9002')!],
      estado: 'vendido',
      fechaSalida: sumarDias(HOY, -5),
      motivoSalida: null,
      pesosSalida: { [idPorChapeta.get('9002')!]: 250.5 },
    },
    HOY,
  )
  await registrarSalida(
    {
      animalIds: [idPorChapeta.get('9003')!],
      estado: 'muerto',
      fechaSalida: sumarDias(HOY, -40),
      motivoSalida: 'Neumonía',
      pesosSalida: {},
    },
    HOY,
  )

  // Pesajes en dos fechas distintas para los dos animales que siguen
  // activos, y una segunda tanda que se anula -- con motivo, autor y fecha
  // de anulación, que el respaldo tiene que mostrar y no esconder.
  await guardarPesaje(
    {
      fecha: sumarDias(HOY, -30),
      metodo: 'bascula',
      responsable: 'Pedro',
      notas: null,
      registradoPorId: usuario.id,
      mediciones: [
        { animalId: idPorChapeta.get('9001')!, pesoKg: 205.4 },
        { animalId: idPorChapeta.get('9004')!, pesoKg: 228.1 },
      ],
    },
    HOY,
  )
  const pesajeAnuladoId = await guardarPesaje(
    {
      fecha: sumarDias(HOY, -15),
      metodo: 'cinta',
      responsable: 'Pedro',
      notas: null,
      registradoPorId: usuario.id,
      mediciones: [
        { animalId: idPorChapeta.get('9001')!, pesoKg: 215 },
        { animalId: idPorChapeta.get('9004')!, pesoKg: 238 },
      ],
    },
    HOY,
  )
  await anularPesaje(pesajeAnuladoId, 'Báscula sin calibrar', usuario.id)

  // Dos movimientos: el lote pasa por el potrero norte y termina en el sur.
  await moverLote({ loteId, potreroDestinoId: potreroNorteId, fecha: sumarDias(HOY, -80), registradoPorId: usuario.id })
  await moverLote({ loteId, potreroDestinoId: potreroSurId, fecha: sumarDias(HOY, -20), registradoPorId: usuario.id })

  // Una novedad vigente, una cerrada, y un hecho puntual sin lote (apunta al potrero).
  await registrarSuministro(
    { fechaInicio: sumarDias(HOY, -25), descripcion: 'Sal mineralizada a voluntad', loteId, registradoPorId: usuario.id },
    HOY,
  )
  const suministroCerradoId = await registrarSuministro(
    { fechaInicio: sumarDias(HOY, -60), descripcion: 'Melaza en el comedero', loteId, registradoPorId: usuario.id },
    HOY,
  )
  await cerrarSuministro(suministroCerradoId, sumarDias(HOY, -40), HOY)
  await registrarHecho(
    {
      fecha: sumarDias(HOY, -10),
      descripcion: 'Se reparó la cerca del potrero sur',
      loteId: null,
      potreroId: potreroSurId,
      registradoPorId: usuario.id,
    },
    HOY,
  )

  // Un evento sanitario puntual (no de lote): la hoja tiene que traer,
  // aparte del lote del EVENTO (vacío aquí), el lote del ANIMAL -- la
  // chapeta sola no basta para identificarlo porque solo es única entre
  // animales activos.
  await registrarEvento({
    tipo: 'vacuna',
    fecha: sumarDias(HOY, -12),
    producto: 'Triple viral',
    dosis: '5ml',
    responsable: 'Vet. Gómez',
    proximaFecha: null,
    notas: null,
    animalId: idPorChapeta.get('9001')!,
    loteId: null,
    registradoPorId: usuario.id,
  })
})

test('el botón de Configuración descarga un .xlsx real con la portada, las 8 hojas y todo lo sembrado', async ({ page }) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Exportar todo a Excel' }).click(),
  ])

  expect(descarga.suggestedFilename()).toBe(`santa-veronica-${HOY}.xlsx`)

  const ruta = await descarga.path()
  if (!ruta) throw new Error('Playwright no guardó la descarga en disco.')
  const buffer = fs.readFileSync(ruta)
  expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK') // es un .xlsx (zip) de verdad, no un HTML de error

  const hojas = leerXlsx(buffer)
  expect(hojas.map((h) => h.nombre)).toEqual([
    'Portada',
    'Animales',
    'Pesajes',
    'Lotes',
    'Potreros',
    'Movimientos',
    'Novedades',
    'Eventos sanitarios',
    'Parámetros',
  ])

  // --- Portada: el archivo se explica solo, sin la pantalla de Configuración ---
  const portada = hojaOFalla(hojas, 'Portada')
  const celdasPortada = [portada.encabezados, ...portada.filas.map((f) => f.map((c) => c.valor))].flat()
  expect(celdasPortada.some((v) => typeof v === 'string' && v.includes('Santa Verónica'))).toBe(true)
  expect(celdasPortada.some((v) => v === 'Exportado el')).toBe(true)
  for (const nombreHoja of [
    'Animales',
    'Pesajes',
    'Lotes',
    'Potreros',
    'Movimientos',
    'Novedades',
    'Eventos sanitarios',
    'Parámetros',
  ]) {
    expect(celdasPortada).toContain(nombreHoja)
  }

  // --- Animales: activos, vendido y muerto, todos presentes ---
  const animales = filasComoObjetos(hojaOFalla(hojas, 'Animales')).filter((f) => f.Lote.valor === NOMBRE_LOTE)
  expect(animales).toHaveLength(4)

  const activo = animales.find((f) => f.Chapeta.valor === '9001')!
  expect(activo.Estado.valor).toBe('Activo')
  expect(activo['Fecha de salida'].valor).toBeNull()
  // La comprobación central que exige el encargo: el peso es una celda
  // numérica de verdad, no texto con apariencia de número.
  expect(activo['Peso de entrada (kg)'].esNumero).toBe(true)
  expect(activo['Peso de entrada (kg)'].esTexto).toBe(false)
  expect(activo['Peso de entrada (kg)'].valor).toBe(180)
  expect(typeof activo['Peso de entrada (kg)'].valor).toBe('number')

  const vendido = animales.find((f) => f.Chapeta.valor === '9002')!
  expect(vendido.Estado.valor).toBe('Vendido')
  expect(excelSerialAFechaISO(vendido['Fecha de salida'].valor as number)).toBe(sumarDias(HOY, -5))
  expect(vendido['Peso de salida (kg)'].esNumero).toBe(true)
  expect(vendido['Peso de salida (kg)'].valor).toBe(250.5)

  const muerto = animales.find((f) => f.Chapeta.valor === '9003')!
  expect(muerto.Estado.valor).toBe('Muerto')
  expect(muerto['Motivo de salida'].valor).toBe('Neumonía')
  expect(muerto['Peso de salida (kg)'].valor).toBeNull()

  // --- Pesajes: dos tandas de dos animales, la segunda anulada ---
  const pesajes = filasComoObjetos(hojaOFalla(hojas, 'Pesajes')).filter((f) => f.Lote.valor === NOMBRE_LOTE)
  expect(pesajes).toHaveLength(4)

  const vigentes = pesajes.filter((f) => f.Anulado.valor !== 'Sí')
  const anulados = pesajes.filter((f) => f.Anulado.valor === 'Sí')
  expect(vigentes).toHaveLength(2)
  expect(anulados).toHaveLength(2)
  for (const fila of anulados) {
    expect(fila['Motivo de anulación'].valor).toBe('Báscula sin calibrar')
    expect(fila['Anulado por'].valor).toBe('Joseph')
    expect(fila['Fecha de anulación'].valor).not.toBeNull()
  }
  const pesajeChapeta9001 = vigentes.find((f) => f.Chapeta.valor === '9001')!
  expect(pesajeChapeta9001['Peso (kg)'].esNumero).toBe(true)
  expect(pesajeChapeta9001['Peso (kg)'].valor).toBe(205.4)
  expect(pesajeChapeta9001.Método.valor).toBe('báscula')
  expect(pesajeChapeta9001['Registrado por'].valor).toBe('Joseph')

  // --- Lotes: el que sembramos, con el potrero actual -- sin la columna
  // calculada "Animales activos", que no existe en la base y se puede
  // derivar de la hoja de Animales.
  const hojaLotes = hojaOFalla(hojas, 'Lotes')
  expect(hojaLotes.encabezados).not.toContain('Animales activos')
  const lote = filasComoObjetos(hojaLotes).find((f) => f.Nombre.valor === NOMBRE_LOTE)!
  expect(lote['Potrero actual'].valor).toBe(NOMBRE_POTRERO_SUR)
  expect(excelSerialAFechaISO(lote['Fecha de apertura'].valor as number)).toBe(FECHA_ENTRADA)

  // --- Potreros: agua real, hectáreas numéricas ---
  const potreros = filasComoObjetos(hojaOFalla(hojas, 'Potreros'))
  const norte = potreros.find((f) => f.Nombre.valor === NOMBRE_POTRERO_NORTE)!
  const sur = potreros.find((f) => f.Nombre.valor === NOMBRE_POTRERO_SUR)!
  expect(norte['Tiene agua'].esBooleano).toBe(true)
  expect(norte['Tiene agua'].valor).toBe(true)
  expect(sur['Tiene agua'].valor).toBe(false)
  expect(norte.Hectáreas.esNumero).toBe(true)
  expect(norte.Hectáreas.valor).toBe(8.25)

  // --- Movimientos: origen vacío en el primero, encadenado en el segundo ---
  const movimientos = filasComoObjetos(hojaOFalla(hojas, 'Movimientos')).filter((f) => f.Lote.valor === NOMBRE_LOTE)
  expect(movimientos).toHaveLength(2)
  const primerMovimiento = movimientos.find((f) => f['Potrero de destino'].valor === NOMBRE_POTRERO_NORTE)!
  expect(primerMovimiento['Potrero de origen'].valor).toBeNull()
  const segundoMovimiento = movimientos.find((f) => f['Potrero de destino'].valor === NOMBRE_POTRERO_SUR)!
  expect(segundoMovimiento['Potrero de origen'].valor).toBe(NOMBRE_POTRERO_NORTE)

  // --- Novedades: vigente, cerrada y un hecho sin lote ---
  const novedades = filasComoObjetos(hojaOFalla(hojas, 'Novedades'))
  const vigente = novedades.find((f) => f.Descripción.valor === 'Sal mineralizada a voluntad')!
  expect(vigente.Tipo.valor).toBe('Suministro en curso')
  expect(vigente['Fecha fin'].valor).toBeNull()
  expect(vigente.Lote.valor).toBe(NOMBRE_LOTE)

  const cerrada = novedades.find((f) => f.Descripción.valor === 'Melaza en el comedero')!
  expect(cerrada['Fecha fin'].valor).not.toBeNull()
  expect(excelSerialAFechaISO(cerrada['Fecha fin'].valor as number)).toBe(sumarDias(HOY, -40))

  const hecho = novedades.find((f) => f.Descripción.valor === 'Se reparó la cerca del potrero sur')!
  expect(hecho.Tipo.valor).toBe('Hecho puntual')
  expect(hecho.Lote.valor).toBeNull()
  expect(hecho.Potrero.valor).toBe(NOMBRE_POTRERO_SUR)

  // --- Eventos sanitarios: el evento puntual trae el lote del ANIMAL,
  // distinto del lote del EVENTO (vacío porque no se aplicó a un lote
  // entero) -- la chapeta sola no identifica al animal fuera de los
  // activos.
  const eventos = filasComoObjetos(hojaOFalla(hojas, 'Eventos sanitarios'))
  const vacuna = eventos.find((f) => f.Chapeta.valor === '9001')!
  expect(vacuna['Lote del animal'].valor).toBe(NOMBRE_LOTE)
  expect(vacuna['Lote del evento'].valor).toBeNull()

  const parametros = filasComoObjetos(hojaOFalla(hojas, 'Parámetros'))
  const hectareasUtiles = parametros.find((f) => f.Clave.valor === 'hectareas_utiles')!
  expect(hectareasUtiles.Valor.esNumero).toBe(true)
  expect(hectareasUtiles.Valor.valor).toBe(35)
})
