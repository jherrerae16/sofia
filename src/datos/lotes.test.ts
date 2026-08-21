import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { crearLote, listarLotes } from './lotes'

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.movimiento.deleteMany()
  await prisma.lote.deleteMany()
})

describe('crearLote', () => {
  it('crea un lote y lo devuelve en el listado', async () => {
    await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    const lotes = await listarLotes()
    expect(lotes).toHaveLength(1)
    expect(lotes[0].nombre).toBe('Ceba 01')
    expect(lotes[0].tipo).toBe('ceba')
    expect(lotes[0].animalesActivos).toBe(0)
  })

  it('rechaza dos lotes con el mismo nombre', async () => {
    await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await expect(
      crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-02' }),
    ).rejects.toThrow()
  })

  it('acepta lotes de leche, que no engordan pero comen pasto', async () => {
    await crearLote({ nombre: 'Leche', tipo: 'leche', fechaApertura: '2026-09-01' })
    const lotes = await listarLotes()
    expect(lotes[0].tipo).toBe('leche')
  })
})
