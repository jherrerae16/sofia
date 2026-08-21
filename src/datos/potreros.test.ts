import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { moverLote } from './movimientos'
import { crearPotrero, listarPotreros } from './potreros'

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.potrero.deleteMany()
})

async function abrirLoteConPeso(nombre: string, chapetas: string[], pesoKg: number) {
  const loteId = await crearLote({ nombre, tipo: 'ceba', fechaApertura: '2026-09-01' })
  const pesos: Record<string, number> = {}
  for (const chapeta of chapetas) pesos[chapeta] = pesoKg
  await crearAnimales({
    loteId,
    chapetas,
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: null,
    pesos,
  })
  return loteId
}

describe('listarPotreros', () => {
  it('agrega el peso vivo de todos los lotes de un potrero, no solo el primero', async () => {
    // Caso demostrado por el revisor: "La Loma", capacidad 600 kg, con Ceba A
    // (300 kg) y Ceba B (400 kg) encima -- 700 kg reales, 116 % de la capacidad.
    // Ver también el aviso equivalente en movimientos.test.ts.
    const laLoma = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 600 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1', 'a2'], 150) // 300 kg
    const cebaBId = await abrirLoteConPeso('Ceba B', ['b1', 'b2'], 200) // 400 kg

    await moverLote({ loteId: cebaAId, potreroDestinoId: laLoma.id, fecha: '2026-09-01', registradoPorId: 'u1' })
    await moverLote({ loteId: cebaBId, potreroDestinoId: laLoma.id, fecha: '2026-09-02', registradoPorId: 'u1' })

    const [potrero] = await listarPotreros('2026-09-21')
    expect(potrero.pesoVivoKg).toBe(700)
    expect(potrero.estadoCapacidad).toBe('sobrecargado')
  })

  it('lista todos los lotes ocupantes de un potrero, no solo el primero', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 2000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 150)
    const cebaBId = await abrirLoteConPeso('Ceba B', ['b1'], 200)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })
    await moverLote({ loteId: cebaBId, potreroDestinoId: potrero.id, fecha: '2026-09-02', registradoPorId: 'u1' })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.lotesOcupantes).toEqual(['Ceba A', 'Ceba B'])
  })

  it('no cuenta un lote cerrado como ocupante del potrero', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 2000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 150)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })
    await prisma.lote.update({ where: { id: cebaAId }, data: { fechaCierre: new Date('2026-09-15T00:00:00.000Z') } })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.lotesOcupantes).toEqual([])
    expect(vista.pesoVivoKg).toBe(0)
    expect(vista.estadoCapacidad).toBe('holgado')
  })

  it('cuenta los días de ocupación desde que entró el lote', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 2000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 150)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.diasOcupacion).toBe(20)
    expect(vista.diasDescanso).toBeNull()
  })

  it('con varios lotes, cuenta los días de ocupación desde el que entró primero', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 2000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 150)
    const cebaBId = await abrirLoteConPeso('Ceba B', ['b1'], 150)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })
    await moverLote({ loteId: cebaBId, potreroDestinoId: potrero.id, fecha: '2026-09-10', registradoPorId: 'u1' })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.diasOcupacion).toBe(20)
  })

  it('cuenta los días de descanso desde que salió el último lote', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 2000 },
    })
    const otro = await prisma.potrero.create({
      data: { nombre: 'El Alto', hectareas: 3, capacidadKg: 2000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 150)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })
    await moverLote({ loteId: cebaAId, potreroDestinoId: otro.id, fecha: '2026-09-05', registradoPorId: 'u1' })

    const [vista] = (await listarPotreros('2026-09-21')).filter((p) => p.id === potrero.id)
    expect(vista.diasDescanso).toBe(16)
    expect(vista.diasOcupacion).toBeNull()
  })

  it('marca ajustado entre 90 y 100 % de la capacidad', async () => {
    const potrero = await prisma.potrero.create({
      data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 1000 },
    })
    const cebaAId = await abrirLoteConPeso('Ceba A', ['a1'], 950)
    await moverLote({ loteId: cebaAId, potreroDestinoId: potrero.id, fecha: '2026-09-01', registradoPorId: 'u1' })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.estadoCapacidad).toBe('ajustado')
  })

  it('marca holgado un potrero vacío', async () => {
    await prisma.potrero.create({ data: { nombre: 'La Loma', hectareas: 3, capacidadKg: 1000 } })
    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.estadoCapacidad).toBe('holgado')
    expect(vista.pesoVivoKg).toBe(0)
    expect(vista.lotesOcupantes).toEqual([])
    expect(vista.diasDescanso).toBeNull()
  })
})

describe('crearPotrero', () => {
  it('crea un potrero y lo devuelve en el listado', async () => {
    await crearPotrero({
      nombre: 'La Loma',
      hectareas: 3,
      capacidadKg: 1000,
      tipoPasto: 'brachiaria',
      tieneAgua: true,
    })

    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.nombre).toBe('La Loma')
    expect(vista.hectareas).toBe(3)
    expect(vista.capacidadKg).toBe(1000)
  })

  it('rechaza dos potreros con el mismo nombre', async () => {
    await crearPotrero({ nombre: 'La Loma', hectareas: 3, capacidadKg: 1000, tipoPasto: null, tieneAgua: true })
    await expect(
      crearPotrero({ nombre: 'La Loma', hectareas: 2, capacidadKg: 500, tipoPasto: null, tieneAgua: false }),
    ).rejects.toThrow()
  })

  it('acepta un potrero sin tipo de pasto registrado', async () => {
    await crearPotrero({ nombre: 'El Alto', hectareas: 4, capacidadKg: 800, tipoPasto: null, tieneAgua: false })
    const [vista] = await listarPotreros('2026-09-21')
    expect(vista.nombre).toBe('El Alto')
  })
})
