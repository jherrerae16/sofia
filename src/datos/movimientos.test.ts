import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { moverLote, revisarMovimiento } from './movimientos'

let loteId: string
let potreroChicoId: string
let potreroGrandeId: string

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.potrero.deleteMany()

  // El brief original fijaba capacidadKg en 1000, pero con 3 animales de 150 kg
  // (450 kg totales) eso da 'holgado' (45 % de uso), no 'sobrecargado' como pide
  // la prueba. Se baja a 400 kg -- el mínimo cambio para que el fixture produzca
  // el escenario que el nombre "Potrero 1 (chico)" y la aserción describen.
  const chico = await prisma.potrero.create({
    data: { nombre: 'Potrero 1', hectareas: 2, capacidadKg: 400 },
  })
  const grande = await prisma.potrero.create({
    data: { nombre: 'Potrero 2', hectareas: 10, capacidadKg: 20000 },
  })
  potreroChicoId = chico.id
  potreroGrandeId = grande.id

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002', '003'],
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: null,
    pesos: { '001': 150, '002': 150, '003': 150 },
  })
})

describe('revisarMovimiento', () => {
  it('avisa que el potrero queda sobrecargado, pero permite el movimiento', async () => {
    const aviso = await revisarMovimiento(loteId, potreroChicoId)
    expect(aviso.estadoResultante).toBe('sobrecargado')
    expect(aviso.permitido).toBe(true)
    expect(aviso.mensaje).toContain('sobrecargado')
  })

  it('no avisa nada cuando el potrero aguanta el lote', async () => {
    const aviso = await revisarMovimiento(loteId, potreroGrandeId)
    expect(aviso.estadoResultante).toBe('holgado')
    expect(aviso.mensaje).toBe('')
  })

  it('suma lo que ya está encima del destino, no solo el lote que se mueve', async () => {
    // Caso demostrado por el revisor: "La Loma", capacidad 600 kg, ya ocupado
    // por Ceba A (300 kg vivos); se mueve Ceba B (400 kg vivos). El total
    // resultante es 700 kg sobre 600 -- 116 % -- y debe salir "sobrecargado",
    // no "holgado" como si solo pesara el lote que entra (400 / 600 = 67 %).
    const laLoma = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 600 },
    })

    const cebaAId = await crearLote({ nombre: 'Ceba A', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId: cebaAId,
      chapetas: ['a1', 'a2'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { a1: 150, a2: 150 },
    })
    await moverLote({
      loteId: cebaAId,
      potreroDestinoId: laLoma.id,
      fecha: '2026-09-01',
      registradoPorId: 'u1',
    })

    const cebaBId = await crearLote({ nombre: 'Ceba B', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId: cebaBId,
      chapetas: ['b1', 'b2'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { b1: 200, b2: 200 },
    })

    const aviso = await revisarMovimiento(cebaBId, laLoma.id)
    expect(aviso.estadoResultante).toBe('sobrecargado')
    expect(aviso.permitido).toBe(true)
    expect(aviso.mensaje).toContain('700')
    expect(aviso.mensaje).toContain('600')
  })
})

describe('moverLote', () => {
  it('registra el movimiento y actualiza el potrero actual del lote', async () => {
    await moverLote({
      loteId,
      potreroDestinoId: potreroGrandeId,
      fecha: '2026-09-05',
      registradoPorId: 'u1',
    })

    const lote = await prisma.lote.findUniqueOrThrow({ where: { id: loteId } })
    expect(lote.potreroActualId).toBe(potreroGrandeId)
    expect(lote.fechaEntradaPotrero?.toISOString().slice(0, 10)).toBe('2026-09-05')
    expect(await prisma.movimiento.count()).toBe(1)
  })

  it('guarda el potrero de origen en el segundo movimiento', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-05', registradoPorId: 'u1' })
    await moverLote({ loteId, potreroDestinoId: potreroChicoId, fecha: '2026-10-05', registradoPorId: 'u1' })

    const ultimo = await prisma.movimiento.findFirstOrThrow({ orderBy: { fecha: 'desc' } })
    expect(ultimo.potreroOrigenId).toBe(potreroGrandeId)
  })

  it('rechaza mover el lote al potrero donde ya está', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-05', registradoPorId: 'u1' })
    await expect(
      moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-10', registradoPorId: 'u1' }),
    ).rejects.toThrow('ya está')
  })
})
