import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { frescura } from './frescura'
import { crearLote } from './lotes'
import { guardarPesaje } from './pesajes'

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
})

describe('frescura', () => {
  it('reporta que no hay datos cuando la finca está vacía', async () => {
    const estado = await frescura('2026-10-01')
    expect(estado.ultimaFecha).toBeNull()
    expect(estado.diasSinDatos).toBeNull()
    expect(estado.alarmante).toBe(true)
  })

  it('cuenta los días desde el último pesaje', async () => {
    const loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id
    await guardarPesaje({
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [{ animalId, pesoKg: 174 }],
    })

    const reciente = await frescura('2026-10-10')
    expect(reciente.diasSinDatos).toBe(9)
    expect(reciente.alarmante).toBe(false)

    const viejo = await frescura('2026-11-20')
    expect(viejo.diasSinDatos).toBe(50)
    expect(viejo.alarmante).toBe(true)
  })
})
