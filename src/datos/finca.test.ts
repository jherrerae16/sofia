import { beforeEach, describe, expect, it } from 'vitest'
import { actualizarHectareasUtiles, obtenerFinca } from './finca'
import { prisma } from './cliente'

beforeEach(async () => {
  await prisma.finca.deleteMany()
})

describe('obtenerFinca', () => {
  it('devuelve la finca con sus hectáreas útiles como número', async () => {
    await prisma.finca.create({ data: { nombre: 'Santa Verónica', hectareasUtiles: 35 } })
    const finca = await obtenerFinca()
    expect(finca).toEqual({ nombre: 'Santa Verónica', hectareasUtiles: 35 })
  })

  it('devuelve null cuando todavía no hay ninguna finca creada', async () => {
    expect(await obtenerFinca()).toBeNull()
  })
})

describe('actualizarHectareasUtiles', () => {
  beforeEach(async () => {
    await prisma.finca.create({ data: { nombre: 'Santa Verónica', hectareasUtiles: 35 } })
  })

  it('sobrescribe el valor -- no hay vigencia ni histórico para este campo', async () => {
    await actualizarHectareasUtiles('40')
    expect(await obtenerFinca()).toEqual({ nombre: 'Santa Verónica', hectareasUtiles: 40 })
  })

  it('rechaza un texto no numérico antes de guardarlo', async () => {
    await expect(actualizarHectareasUtiles('muchas')).rejects.toThrow(/número/)
    expect((await obtenerFinca())?.hectareasUtiles).toBe(35)
  })

  it('rechaza cero y negativos', async () => {
    await expect(actualizarHectareasUtiles('0')).rejects.toThrow(/mayor que cero/)
    await expect(actualizarHectareasUtiles('-5')).rejects.toThrow(/mayor que cero/)
  })

  it('avisa con claridad si todavía no hay ninguna finca configurada', async () => {
    await prisma.finca.deleteMany()
    await expect(actualizarHectareasUtiles('40')).rejects.toThrow(/finca/i)
  })
})
