import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { frescura } from './frescura'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { crearLote } from './lotes'
import {
  anularPesaje,
  guardarPesaje,
  historialDeAnimal,
  listarPesajesDeLote,
  pesoVivoPorLote,
  revisarTanda,
  ultimoPesoPorAnimal,
} from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await limpiarTablasOperativas()

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

  it('rechaza una tanda sin ninguna medición', async () => {
    // `revisarAccion` ya rechaza esto en la interfaz ("No hay ningún peso
    // digitado"), pero esa validación vive en el server action, no en
    // `guardarPesaje`. Sin esta guardia, una tanda vacía que llegara hasta
    // aquí por cualquier otro camino -- el mismo que abrió E1, cuando el
    // segundo envío reenviaba el formulario ya vacío -- crearía un pesaje
    // real, con fecha de hoy y cero mediciones, apagando en silencio la
    // alarma de frescura. Es la red que debió atrapar E1 desde el primer
    // día.
    await expect(
      guardarPesaje(
        {
          fecha: '2026-10-01',
          metodo: 'cinta',
          responsable: 'Joseph',
          notas: null,
          registradoPorId: 'u1',
          mediciones: [],
        },
        '2026-10-01',
      ),
    ).rejects.toThrow(/ningún peso/)

    expect(await prisma.pesaje.count()).toBe(0)
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

  it('sin filtro, suma lotes de cualquier tipo -- la carga sobre el potrero no distingue leche de ceba', async () => {
    const loteLecheId = await crearLote({ nombre: 'Leche 01', tipo: 'leche', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId: loteLecheId,
      chapetas: ['901'],
      sexo: 'hembra',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '901': 480 },
    })

    const pesos = await pesoVivoPorLote()
    expect(pesos.get(loteId)).toBe(300) // 150 + 150, sin ningún pesaje todavía
    expect(pesos.get(loteLecheId)).toBe(480)
  })

  it('con filtro de tipo, solo suma los lotes de ese tipo -- la portada de "Engorde" no debe contar la lechería', async () => {
    const loteLecheId = await crearLote({ nombre: 'Leche 01', tipo: 'leche', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId: loteLecheId,
      chapetas: ['901'],
      sexo: 'hembra',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '901': 480 },
    })

    const pesosCeba = await pesoVivoPorLote('ceba')
    expect(pesosCeba.get(loteId)).toBe(300)
    expect(pesosCeba.has(loteLecheId)).toBe(false)

    const pesosLeche = await pesoVivoPorLote('leche')
    expect(pesosLeche.get(loteLecheId)).toBe(480)
    expect(pesosLeche.has(loteId)).toBe(false)
  })
})

describe('anularPesaje', () => {
  it('exige un motivo no vacío', async () => {
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

    await expect(anularPesaje(pesajeId, '', 'u2')).rejects.toThrow(/motivo/)
    await expect(anularPesaje(pesajeId, '   ', 'u2')).rejects.toThrow(/motivo/)

    const pesaje = await prisma.pesaje.findUniqueOrThrow({ where: { id: pesajeId } })
    expect(pesaje.anuladoEn).toBeNull()
  })

  it('marca la sesión como anulada, con motivo, fecha y quién anuló, sin borrar nada', async () => {
    const pesajeId = await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [
          { animalId: idPorChapeta['001'], pesoKg: 174 },
          { animalId: idPorChapeta['002'], pesoKg: 176 },
        ],
      },
      '2026-10-01',
    )

    await anularPesaje(pesajeId, 'Se digitó 174 en vez de 147: dedazo detectado tarde.', 'u2')

    const pesaje = await prisma.pesaje.findUniqueOrThrow({ where: { id: pesajeId } })
    expect(pesaje.anuladoEn).not.toBeNull()
    expect(pesaje.motivoAnulacion).toBe('Se digitó 174 en vez de 147: dedazo detectado tarde.')
    expect(pesaje.anuladoPorId).toBe('u2')

    // No borra nada: las mediciones siguen en la base.
    const mediciones = await prisma.medicion.findMany({ where: { pesajeId } })
    expect(mediciones).toHaveLength(2)
  })

  it('no se puede anular dos veces', async () => {
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

    await anularPesaje(pesajeId, 'Motivo original.', 'u2')
    await expect(anularPesaje(pesajeId, 'Otro motivo.', 'u2')).rejects.toThrow(/ya está anulad/)
  })

  it('no se puede anular dos veces, ni siquiera en una carrera: la condición vive en el where, no en un chequeo en memoria', async () => {
    // Este caso es distinto del anterior: ahí las dos llamadas son
    // secuenciales, así que la primera ya terminó de escribir cuando
    // arranca la segunda -- eso lo protegería igual un chequeo en memoria.
    // Aquí se lanzan las dos con Promise.allSettled, sin esperar a que la
    // primera termine (el doble clic real, o dos pestañas). Antes de este
    // arreglo, ambas leían `anuladoEn: null` antes de que cualquiera
    // hubiera escrito, y ambas pasaban el chequeo -- la segunda pisaba en
    // silencio el motivo y el autor de la primera, sin que nadie se
    // enterara. Con la condición en el `where`, solo una puede ganar: a la
    // otra la base de datos le devuelve cero filas afectadas (`P2025`), que
    // se traduce al mismo mensaje de "ya está anulado".
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

    const resultados = await Promise.allSettled([
      anularPesaje(pesajeId, 'Motivo A, primera de la carrera.', 'u2'),
      anularPesaje(pesajeId, 'Motivo B, segunda de la carrera.', 'u3'),
    ])

    const exitosas = resultados.filter((r) => r.status === 'fulfilled')
    const fallidas = resultados.filter((r) => r.status === 'rejected')
    expect(exitosas).toHaveLength(1)
    expect(fallidas).toHaveLength(1)
    expect((fallidas[0] as PromiseRejectedResult).reason.message).toMatch(/ya está anulad/)

    // Y el motivo que quedó grabado es el de la que ganó, no una mezcla ni
    // el de la que perdió -- la anulación sí ocurrió, una sola vez, con
    // datos consistentes.
    const pesaje = await prisma.pesaje.findUniqueOrThrow({ where: { id: pesajeId } })
    expect(pesaje.anuladoEn).not.toBeNull()
    expect(['Motivo A, primera de la carrera.', 'Motivo B, segunda de la carrera.']).toContain(
      pesaje.motivoAnulacion,
    )
  })

  it('traduce a español el caso de anular un pesaje que no existe', async () => {
    await expect(anularPesaje('no-existe', 'Motivo.', 'u2')).rejects.toThrow('Este pesaje no existe.')
  })

  it('saca las mediciones anuladas del historial del animal y del último peso por animal', async () => {
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

    expect(await historialDeAnimal(idPorChapeta['001'])).toHaveLength(1)
    expect((await ultimoPesoPorAnimal()).has(idPorChapeta['001'])).toBe(true)

    await anularPesaje(pesajeId, 'Dedazo: el animal 001 no fue pesado ese día.', 'u2')

    expect(await historialDeAnimal(idPorChapeta['001'])).toHaveLength(0)
    expect((await ultimoPesoPorAnimal()).has(idPorChapeta['001'])).toBe(false)
  })

  it('saca el pesaje anulado del cálculo de frescura', async () => {
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

    expect((await frescura('2026-10-05')).ultimaFecha).toBe('2026-10-01')

    await anularPesaje(pesajeId, 'Fecha digitada mal, se corregirá con un pesaje nuevo.', 'u2')

    expect((await frescura('2026-10-05')).ultimaFecha).toBeNull()
  })
})

describe('listarPesajesDeLote', () => {
  it('lista las sesiones que tocaron el lote, más recientes primero, con la anulación visible', async () => {
    const primero = await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [
          { animalId: idPorChapeta['001'], pesoKg: 174 },
          { animalId: idPorChapeta['002'], pesoKg: 176 },
        ],
      },
      '2026-10-01',
    )
    const segundo = await guardarPesaje(
      {
        fecha: '2026-10-15',
        metodo: 'bascula',
        responsable: 'Sofanor',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 180 }],
      },
      '2026-10-15',
    )

    let lista = await listarPesajesDeLote(loteId)
    expect(lista.map((p) => p.id)).toEqual([segundo, primero])
    expect(lista[0].cantidadAnimales).toBe(1)
    expect(lista[1].cantidadAnimales).toBe(2)
    expect(lista[1].anuladoEn).toBeNull()

    await anularPesaje(primero, 'Dedazo en el 001.', 'u2')
    lista = await listarPesajesDeLote(loteId)
    const anulado = lista.find((p) => p.id === primero)
    expect(anulado?.anuladoEn).not.toBeNull()
    expect(anulado?.motivoAnulacion).toBe('Dedazo en el 001.')
  })

  it('no mezcla sesiones de otro lote', async () => {
    const otroLoteId = await crearLote({ nombre: 'Ceba 02', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId: otroLoteId,
      chapetas: ['501'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '501': 150 },
    })
    const otroAnimalId = (await listarAnimalesDeLote(otroLoteId))[0].id
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: otroAnimalId, pesoKg: 174 }],
      },
      '2026-10-01',
    )

    expect(await listarPesajesDeLote(loteId)).toHaveLength(0)
    expect(await listarPesajesDeLote(otroLoteId)).toHaveLength(1)
  })
})
