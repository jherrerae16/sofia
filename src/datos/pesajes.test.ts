import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { guardarPesaje, pesoVivoPorLote, revisarTanda, ultimoPesoPorAnimal } from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()

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
})

describe('revisarTanda', () => {
  it('devuelve la ganancia diaria que resultaría de cada peso digitado', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      '2026-10-01',
      '2026-10-01',
    )
    expect(revision[0].gdp).toBe(800)
    expect(revision[0].nivel).toBe('ok')
  })

  it('advierte por una ganancia imposible sin bloquear el guardado', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 400 }],
      '2026-10-01',
      '2026-10-01',
    )
    expect(revision[0].nivel).toBe('advertencia')
    expect(revision[0].mensaje).toContain('g/día')
  })

  it('rechaza un pesaje anterior al ingreso del animal', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 150 }],
      '2026-08-01',
      '2026-08-01',
    )
    expect(revision[0].nivel).toBe('rechazo')
  })

  it('advierte por una ganancia imposible en el tramo hacia adelante cuando el pesaje se digita con retraso', async () => {
    // El pesaje del 2026-11-01 ya existe (se guardó a tiempo). Semanas después
    // se digita, con retraso, el del 2026-10-15 — pero se escribe 160 en vez
    // de 190. Mirando solo hacia atrás (150 -> 160 en 44 días = 227 g/día) se
    // ve perfectamente normal; el dedazo únicamente se nota en el tramo hacia
    // el pesaje posterior: (202 - 160) * 1000 / 17 días = 2470.58... -> 2471 g/día,
    // por encima del umbral de 2000.
    await guardarPesaje(
      {
        fecha: '2026-11-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 202 }],
      },
      '2026-11-01',
    )

    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 160 }],
      '2026-10-15',
      '2026-11-15',
    )

    expect(revision[0].nivel).toBe('advertencia')
    expect(revision[0].mensaje).toContain('2.471 g/día')
    // El gdp mostrado sigue siendo el del tramo hacia atrás (150 -> 160 en 44
    // días): (160 - 150) * 1000 / 44 = 227.27... -> 227. La advertencia se nota
    // en el nivel y el mensaje, no en el número que ve el usuario en su fila.
    expect(revision[0].gdp).toBe(227)
  })

  it('rechaza un segundo pesaje del mismo animal en la misma fecha', async () => {
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      },
      '2026-10-01',
    )

    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      '2026-10-01',
      '2026-10-01',
    )
    expect(revision[0].nivel).toBe('rechazo')
    expect(revision[0].mensaje).toContain('mismo día')
  })
})

describe('guardarPesaje', () => {
  it('guarda una sesión con solo algunos animales del lote', async () => {
    const pesajeId = await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      },
      '2026-10-01',
    )

    expect(pesajeId).toBeTruthy()
    const ultimos = await ultimoPesoPorAnimal()
    expect(ultimos.get(idPorChapeta['001'])).toEqual({ fecha: '2026-10-01', pesoKg: 174 })
    expect(ultimos.has(idPorChapeta['002'])).toBe(false)
  })

  it('no guarda nada si alguna medición es rechazable', async () => {
    await expect(
      guardarPesaje(
        {
          fecha: '2026-08-01',
          metodo: 'cinta',
          responsable: 'Joseph',
          notas: null,
          registradoPorId: 'u1',
          mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
        },
        '2026-08-01',
      ),
    ).rejects.toThrow()

    expect(await prisma.pesaje.count()).toBe(0)
  })

  it('guarda aunque haya advertencias, porque la pérdida de peso puede ser real', async () => {
    const pesajeId = await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: 'Verano fuerte',
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 120 }],
      },
      '2026-10-01',
    )
    expect(pesajeId).toBeTruthy()
  })

  it('rechaza reenviar la misma tanda en la misma fecha y no duplica el pesaje', async () => {
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      },
      '2026-10-01',
    )

    await expect(
      guardarPesaje(
        {
          fecha: '2026-10-01',
          metodo: 'cinta',
          responsable: 'Joseph',
          notas: null,
          registradoPorId: 'u1',
          mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
        },
        '2026-10-01',
      ),
    ).rejects.toThrow(/mismo día/)

    expect(await prisma.pesaje.count()).toBe(1)
    expect(await prisma.medicion.count()).toBe(1)
  })
})

describe('pesoVivoPorLote', () => {
  it('usa el último peso medido de cada animal y el de entrada si nunca se pesó', async () => {
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      },
      '2026-10-01',
    )

    const pesos = await pesoVivoPorLote()
    expect(pesos.get(loteId)).toBe(324)
  })
})
