import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { desempeno } from './desempeno'
import { crearLote } from './lotes'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.parametro.deleteMany()

  for (const [clave, valor] of Object.entries({
    umbral_excelente: '900',
    umbral_bueno: '750',
    umbral_normal: '600',
    umbral_bajo: '400',
  })) {
    await guardarParametro(clave, valor, '2026-01-01', 'u1')
  }

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002'],
    sexo: 'macho',
    raza: 'Brahman',
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: 14,
    pesos: { '001': 150, '002': 150 },
  })
  const animales = await listarAnimalesDeLote(loteId)
  idPorChapeta = Object.fromEntries(animales.map((a) => [a.chapeta, a.id]))

  await guardarPesaje({
    fecha: '2026-10-01',
    metodo: 'cinta',
    responsable: 'Joseph',
    notas: null,
    registradoPorId: 'u1',
    mediciones: [
      { animalId: idPorChapeta['001'], pesoKg: 174 },
      { animalId: idPorChapeta['002'], pesoKg: 162 },
    ],
  })
  await guardarPesaje({
    fecha: '2026-11-01',
    metodo: 'cinta',
    responsable: 'Joseph',
    notas: null,
    registradoPorId: 'u1',
    mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 202 }],
  })
})

describe('desempeno', () => {
  it('calcula la ganancia del último tramo de cada animal', async () => {
    const { filas } = await desempeno('ultimo_pesaje', '2026-11-15')
    const uno = filas.find((f) => f.chapeta === '001')!
    expect(uno.gdpPeriodo).toBe(903)
    expect(uno.clasificacion).toBe('excelente')
  })

  it('calcula la ganancia acumulada desde la entrada', async () => {
    const { filas } = await desempeno('acumulado', '2026-11-15')
    const uno = filas.find((f) => f.chapeta === '001')!
    expect(uno.gdpAcumulada).toBe(852)
    expect(uno.kgGanados).toBe(52)
  })

  it('separa al animal que no se pesó en la última sesión', async () => {
    const { filas } = await desempeno('ultimo_pesaje', '2026-11-15')
    const dos = filas.find((f) => f.chapeta === '002')!
    expect(dos.fechaUltimoPesaje).toBe('2026-10-01')
    expect(dos.gdpPeriodo).toBe(400)
    expect(dos.clasificacion).toBe('bajo')
  })

  it('reporta el promedio con su n y su cobertura', async () => {
    const { resumen } = await desempeno('acumulado', '2026-11-15')
    expect(resumen.n).toBe(2)
    expect(resumen.total).toBe(2)
    expect(resumen.cobertura).toBe(1)
  })

  it('deja sin dato al animal que nunca se ha pesado', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['003'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '003': 150 },
    })

    const { filas, resumen } = await desempeno('acumulado', '2026-11-15')
    const tres = filas.find((f) => f.chapeta === '003')!
    expect(tres.gdpAcumulada).toBeNull()
    expect(tres.clasificacion).toBe('sin_dato')
    expect(resumen.n).toBe(2)
    expect(resumen.total).toBe(3)
  })
})
