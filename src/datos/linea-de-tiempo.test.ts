import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote, registrarSalida } from './animales'
import { prisma } from './cliente'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { lineaDeTiempoDeAnimal } from './linea-de-tiempo'
import { crearLote } from './lotes'
import { moverLote } from './movimientos'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'
import { crearPotrero } from './potreros'
import { registrarEvento } from './sanidad'

let loteId: string
let animalId: string

beforeEach(async () => {
  await limpiarTablasOperativas()
  await prisma.parametro.deleteMany()
  await guardarParametro('gdp_objetivo', '750', '2026-01-01', 'u1')

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001'],
    sexo: 'macho',
    raza: 'Brangus',
    cruce: null,
    proveedor: 'Hacienda El Porvenir',
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: 14,
    pesos: { '001': 150 },
  })
  animalId = (await listarAnimalesDeLote(loteId))[0].id
})

async function pesar(fecha: string, pesoKg: number): Promise<void> {
  await guardarPesaje(
    {
      fecha,
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [{ animalId, pesoKg }],
    },
    '2026-12-01',
  )
}

describe('lineaDeTiempoDeAnimal', () => {
  it('con nada registrado, la entrada es el único suceso', async () => {
    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    expect(sucesos).toHaveLength(1)
    expect(sucesos[0].clase).toBe('entrada')
    expect(sucesos[0].fecha).toBe('2026-09-01')
    expect(sucesos[0].cifra).toBe('150,0 kg')
    // De dónde vino es parte de la historia del animal, no un adorno.
    expect(sucesos[0].detalle).toContain('Hacienda El Porvenir')
  })

  it('un pesaje trae su ganancia diaria contra el pesaje anterior', async () => {
    await pesar('2026-10-01', 180)
    await pesar('2026-11-01', 210)

    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    // 30 kg en 31 días = 968 g/día, contra el pesaje de octubre y no contra
    // la entrada: la línea cuenta tramos, no acumulados.
    expect(sucesos[0].clase).toBe('pesaje')
    // El método sale por su etiqueta en español, nunca el valor crudo del enum.
    expect(sucesos[0].que).toBe('Pesaje con cinta bovinométrica')
    expect(sucesos[0].cifra).toBe('210,0 kg')
    expect(sucesos[0].cifraChica).toBe('968 g/día')
  })

  it('el primer pesaje se mide contra la entrada, que es el único punto anterior', async () => {
    await pesar('2026-10-01', 180)

    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    // 30 kg en 30 días.
    expect(sucesos[0].cifraChica).toBe('1.000 g/día')
  })

  it('un pesaje por debajo de la meta queda marcado como malo', async () => {
    await pesar('2026-10-01', 155)

    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    // 5 kg en 30 días = 167 g/día, muy por debajo de la meta de 750.
    expect(sucesos[0].malo).toBe(true)
  })

  it('una aplicación sanitaria aparece con su producto y cuándo vuelve a tocar', async () => {
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-20',
      producto: 'Ivermectina 1%',
      dosis: '1 ml / 50 kg',
      responsable: 'Joseph',
      proximaFecha: '2026-12-20',
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    const suceso = (await lineaDeTiempoDeAnimal(animalId, '2026-12-01')).find(
      (s) => s.clase === 'sanidad',
    )!

    expect(suceso.que).toContain('Ivermectina 1%')
    expect(suceso.detalle).toContain('1 ml / 50 kg')
    expect(suceso.detalle).toContain('2026-12-20')
  })

  it('una aplicación anulada no aparece en la historia del animal', async () => {
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-20',
      producto: 'Aftosa',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: null,
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })
    await prisma.eventoSanitario.updateMany({
      data: { anuladoEn: new Date(), motivoAnulacion: 'Dedazo' },
    })

    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')
    expect(sucesos.filter((s) => s.clase === 'sanidad')).toHaveLength(0)
  })

  it('un movimiento del lote aparece como suceso del animal', async () => {
    const origen = await crearPotrero({ nombre: 'El Mango', hectareas: 9, capacidadKg: 8000, tipoPasto: null, tieneAgua: true })
    const destino = await crearPotrero({ nombre: 'El Jobo', hectareas: 7, capacidadKg: 7000, tipoPasto: null, tieneAgua: true })
    await moverLote({
      loteId,
      potreroDestinoId: origen,
      fecha: '2026-09-05',
      registradoPorId: 'u1',
    })
    await moverLote({
      loteId,
      potreroDestinoId: destino,
      fecha: '2026-10-10',
      registradoPorId: 'u1',
    })

    const movimientos = (await lineaDeTiempoDeAnimal(animalId, '2026-12-01')).filter(
      (s) => s.clase === 'movimiento',
    )

    expect(movimientos).toHaveLength(2)
    expect(movimientos[0].que).toContain('El Mango')
    expect(movimientos[0].que).toContain('El Jobo')
  })

  it('un movimiento anterior a la entrada del animal no es suyo', async () => {
    const potrero = await crearPotrero({ nombre: 'El Mango', hectareas: 9, capacidadKg: 8000, tipoPasto: null, tieneAgua: true })
    await moverLote({
      loteId,
      potreroDestinoId: potrero,
      fecha: '2026-08-15',
      registradoPorId: 'u1',
    })

    // El lote se movió dos semanas antes de que este animal entrara: no le
    // pasó a él, y ponerlo en su historia es inventarle un pasado.
    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')
    expect(sucesos.filter((s) => s.clase === 'movimiento')).toHaveLength(0)
  })

  it('la salida encabeza la historia, con su estado en español y su peso', async () => {
    await pesar('2026-10-01', 180)
    await registrarSalida(
      {
        animalIds: [animalId],
        estado: 'vendido',
        fechaSalida: '2026-11-15',
        motivoSalida: null,
        pesosSalida: { [animalId]: 250 },
        confirmarPesosSospechosos: true,
      },
      '2026-12-01',
    )

    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    expect(sucesos[0].clase).toBe('salida')
    expect(sucesos[0].que).toContain('Vendido')
    expect(sucesos[0].cifra).toBe('250,0 kg')
  })

  it('los sucesos vienen de lo más nuevo a lo más viejo', async () => {
    await pesar('2026-10-01', 180)
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-20',
      producto: 'Aftosa',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: null,
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    const fechas = (await lineaDeTiempoDeAnimal(animalId, '2026-12-01')).map((s) => s.fecha)

    // Lo último que pasó primero: es como el dueño lee la ficha.
    expect(fechas).toEqual(['2026-10-01', '2026-09-20', '2026-09-01'])
  })

  it('sin meta fijada la historia se arma igual, sin marcar a nadie como malo', async () => {
    await prisma.parametro.deleteMany()
    await pesar('2026-10-01', 155)

    // Sin meta contra la cual medir no se dice quién va mal, y todo lo demás
    // de la ficha sigue en pie.
    const sucesos = await lineaDeTiempoDeAnimal(animalId, '2026-12-01')

    expect(sucesos).toHaveLength(2)
    expect(sucesos[0].clase).toBe('pesaje')
    expect(sucesos[0].malo).toBe(false)
  })
})
