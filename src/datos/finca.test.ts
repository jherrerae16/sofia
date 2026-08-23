import { beforeEach, describe, expect, it } from 'vitest'
import { obtenerFinca } from './finca'
import { prisma } from './cliente'

beforeEach(async () => {
  await prisma.finca.deleteMany()
})

// Las hectáreas útiles se probaban aquí antes de moverse a `Parametro` (ver
// `src/datos/parametros.test.ts`, describe 'configurarParametro — hectáreas
// útiles'): `Finca` ya no las guarda, así que lo único que queda por probar
// de este archivo es la lectura del nombre.
describe('obtenerFinca', () => {
  it('devuelve la finca', async () => {
    await prisma.finca.create({ data: { nombre: 'Santa Verónica' } })
    const finca = await obtenerFinca()
    expect(finca).toEqual({ nombre: 'Santa Verónica' })
  })

  it('devuelve null cuando todavía no hay ninguna finca creada', async () => {
    expect(await obtenerFinca()).toBeNull()
  })
})
