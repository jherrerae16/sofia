import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { desempeno, normalizarPeriodo } from './desempeno'
import { crearLote } from './lotes'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
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

  await guardarPesaje(
    {
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [
        { animalId: idPorChapeta['001'], pesoKg: 174 },
        { animalId: idPorChapeta['002'], pesoKg: 162 },
      ],
    },
    '2026-10-01',
  )
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

  it('con dos o más pesajes dentro de la ventana, usa el más viejo de ellos como referencia (dias_30)', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['004'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '004': 150 },
    })
    const animales = await listarAnimalesDeLote(loteId)
    const id004 = animales.find((a) => a.chapeta === '004')!.id

    // Dos pesajes recientes y cercanos entre sí, ambos dentro de los últimos 30 días.
    await guardarPesaje(
      {
        fecha: '2026-10-16',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id004, pesoKg: 181.5 }],
      },
      '2026-10-16',
    )
    await guardarPesaje(
      {
        fecha: '2026-10-31',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id004, pesoKg: 192.0 }],
      },
      '2026-10-31',
    )

    // Cálculo a mano:
    // La ventana de dias_30 con hoy=2026-11-15 cubre desde 2026-10-16 (diasEntre <= 30).
    //   diasEntre('2026-10-16','2026-11-15') = 30 -> dentro (el límite es <=, no <).
    //   diasEntre('2026-10-31','2026-11-15') = 15 -> dentro.
    // Los dos pesajes caen dentro de la ventana (dentro.length = 2), así que
    // `referencia` debe tomar el más viejo de los dos (2026-10-16, 181.5 kg),
    // NUNCA el de entrada ni el más reciente.
    // dias = diasEntre('2026-10-16','2026-10-31') = 15
    // gdp = (192.0 - 181.5) * 1000 / 15 = 10500 / 15 = 700 g/día (exacto)
    // Con umbral_normal=600 y umbral_bueno=750: 700 cae en 'normal'.
    const { filas } = await desempeno('dias_30', '2026-11-15')
    const cuatro = filas.find((f) => f.chapeta === '004')!
    expect(cuatro.gdpPeriodo).toBe(700)
    expect(cuatro.clasificacion).toBe('normal')
  })

  it('con una sola medición dentro de la ventana, retrocede a la última anterior a ella (dias_60)', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['005'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-08-01',
      edadEntradaMeses: 16,
      pesos: { '005': 150 },
    })
    const animales = await listarAnimalesDeLote(loteId)
    const id005 = animales.find((a) => a.chapeta === '005')!.id

    // Un pesaje viejo (fuera de la ventana de 60 días) y uno reciente (dentro).
    await guardarPesaje(
      {
        fecha: '2026-09-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id005, pesoKg: 172 }],
      },
      '2026-09-01',
    )
    await guardarPesaje(
      {
        fecha: '2026-11-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id005, pesoKg: 214 }],
      },
      '2026-11-01',
    )

    // Cálculo a mano:
    // La ventana de dias_60 con hoy=2026-11-15 cubre desde 2026-09-16 (diasEntre <= 60).
    //   diasEntre('2026-09-01','2026-11-15') = 75 -> fuera de la ventana (anterior).
    //   diasEntre('2026-11-01','2026-11-15') = 14 -> dentro.
    // Solo una medición cae dentro (dentro.length = 1 < 2), así que `referencia`
    // retrocede a la última anterior a la ventana: el pesaje del 2026-09-01 (172 kg).
    // dias = diasEntre('2026-09-01','2026-11-01') = 61
    // gdp = (214 - 172) * 1000 / 61 = 42000 / 61 = 688.524... -> redondea a 689 g/día
    // Con umbral_normal=600 y umbral_bueno=750: 689 cae en 'normal'.
    const { filas } = await desempeno('dias_60', '2026-11-15')
    const cinco = filas.find((f) => f.chapeta === '005')!
    expect(cinco.gdpPeriodo).toBe(689)
    expect(cinco.clasificacion).toBe('normal')
  })

  it('sin ninguna medición dentro de la ventana, retrocede a la última anterior y da sin dato (dias_30)', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['006'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-08-15',
      edadEntradaMeses: 15,
      pesos: { '006': 150 },
    })
    const animales = await listarAnimalesDeLote(loteId)
    const id006 = animales.find((a) => a.chapeta === '006')!.id

    // Dos pesajes, ambos viejos: el animal no se ha vuelto a pesar en los últimos 30 días.
    await guardarPesaje(
      {
        fecha: '2026-09-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id006, pesoKg: 162 }],
      },
      '2026-09-01',
    )
    await guardarPesaje(
      {
        fecha: '2026-09-20',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: id006, pesoKg: 175.3 }],
      },
      '2026-09-20',
    )

    // Cálculo a mano:
    // La ventana de dias_30 con hoy=2026-11-15 cubre desde 2026-10-16 (diasEntre <= 30).
    //   diasEntre('2026-09-01','2026-11-15') = 75 -> fuera.
    //   diasEntre('2026-09-20','2026-11-15') = 55 -> fuera.
    // Ningún pesaje cae dentro de la ventana (dentro.length = 0), así que `referencia`
    // retrocede a la última anterior: el pesaje del 2026-09-20 (175.3 kg). Como ese
    // pesaje es también el último de toda la historia del animal, `referencia` y
    // `ultimo` terminan siendo la MISMA medición. gdpEntre compara una medición
    // consigo misma: diasEntre da 0 días, y con dias<=0 la función devuelve null
    // (no cero): no hay ningún tramo de tiempo que medir dentro de esta ventana.
    // Es el resultado sensato -- no se puede afirmar una ganancia "de los últimos
    // 30 días" cuando no hubo ningún pesaje en esos 30 días -- y coincide con la
    // decisión de diseño de nunca acusar de "crítico" a un animal sobre el que no
    // hay dato: clasificar(null, umbrales) da 'sin_dato'.
    const { filas } = await desempeno('dias_30', '2026-11-15')
    const seis = filas.find((f) => f.chapeta === '006')!
    expect(seis.fechaUltimoPesaje).toBe('2026-09-20')
    expect(seis.gdpPeriodo).toBeNull()
    expect(seis.clasificacion).toBe('sin_dato')
  })
})

describe('normalizarPeriodo', () => {
  it('acepta cada uno de los periodos válidos tal cual', () => {
    expect(normalizarPeriodo('ultimo_pesaje')).toBe('ultimo_pesaje')
    expect(normalizarPeriodo('dias_30')).toBe('dias_30')
    expect(normalizarPeriodo('dias_60')).toBe('dias_60')
    expect(normalizarPeriodo('dias_90')).toBe('dias_90')
    expect(normalizarPeriodo('acumulado')).toBe('acumulado')
  })

  it('cae a ultimo_pesaje cuando el valor de la URL no es un periodo conocido', () => {
    // Un enlace viejo o un dedazo (p. ej. "?periodo=dias_45") no debe colar
    // silenciosamente: sin esta validación, la ventana de días queda
    // indefinida, todas las comparaciones dan falso y la función retrocede a
    // la ganancia acumulada disfrazada de ganancia del periodo.
    expect(normalizarPeriodo('dias_45')).toBe('ultimo_pesaje')
    expect(normalizarPeriodo(undefined)).toBe('ultimo_pesaje')
    expect(normalizarPeriodo('')).toBe('ultimo_pesaje')
  })
})
