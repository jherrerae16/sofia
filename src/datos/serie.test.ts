import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { crearLote } from './lotes'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'
import { serieDeAnimal, serieDePesoPromedio } from './serie'

let loteId: string
let ids: Record<string, string>

beforeEach(async () => {
  await limpiarTablasOperativas()
  // `limpiarTablasOperativas` no toca `Parametro` a propósito (no participa
  // del grafo de llaves foráneas), pero esta suite sí necesita controlarlo:
  // la prueba del "sin objetivo configurado" solo dice algo si no quedó un
  // gdp_objetivo sembrado por la prueba anterior.
  await prisma.parametro.deleteMany()

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-01-15' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002'],
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-01-15',
    edadEntradaMeses: null,
    pesos: { '001': 200, '002': 220 },
  })
  ids = Object.fromEntries((await listarAnimalesDeLote(loteId)).map((a) => [a.chapeta, a.id]))
})

async function pesar(fecha: string, pesos: Record<string, number>): Promise<void> {
  await guardarPesaje(
    {
      fecha,
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: Object.entries(pesos).map(([chapeta, pesoKg]) => ({
        animalId: ids[chapeta],
        pesoKg,
      })),
    },
    '2026-03-01',
  )
}

describe('serieDePesoPromedio', () => {
  it('el primer punto es la entrada, con el promedio de los pesos de entrada', async () => {
    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    expect(serie.puntos[0].fecha).toBe('2026-01-15')
    expect(serie.puntos[0].pesoPromedioKg).toBe(210)
    expect(serie.animalesDelLote).toBe(2)
  })

  it('cada pesaje agrega un punto con el promedio de ese día', async () => {
    await pesar('2026-02-15', { '001': 230, '002': 250 })

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    expect(serie.puntos).toHaveLength(2)
    expect(serie.puntos[1]).toMatchObject({
      fecha: '2026-02-15',
      pesoPromedioKg: 240,
      animales: 2,
    })
  })

  it('una tanda que no alcanzó a todos no brinca: al que faltó se le cuenta su peso anterior', async () => {
    await pesar('2026-02-15', { '001': 230 })

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    // 230 del que sí se pesó y 220 del que no (su peso de entrada). No 230:
    // promediar solo a los pesados haría subir la curva sin que ningún animal
    // hubiera engordado, y si los que faltaron son los flacos el dueño lee
    // una mejora que no pasó.
    expect(serie.puntos[1].pesoPromedioKg).toBe(225)
    // Pero la cobertura del día sí dice 1: es lo que avisa el pie de la gráfica.
    expect(serie.puntos[1].animales).toBe(1)
  })

  it('un animal que entró después no arrastra la curva hacia atrás', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['050'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-02-20',
      edadEntradaMeses: null,
      pesos: { '050': 160 },
    })

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    // El punto de la entrada del lote es de antes de que el 050 llegara: sus
    // 160 kg no pueden bajar un promedio de un día en que no estaba.
    expect(serie.puntos[0].pesoPromedioKg).toBe(210)
  })

  it('la trayectoria objetivo sale del gdp configurado y de los días desde la entrada', async () => {
    await guardarParametro('gdp_objetivo', '800', '2026-01-01', 'u1')
    await pesar('2026-02-15', { '001': 230, '002': 250 })

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    // 31 días a 800 g/día son 24,8 kg sobre el promedio de entrada de 210.
    expect(serie.puntos[1].objetivoKg).toBe(234.8)
    // Y en el día de la entrada la trayectoria arranca en el peso de entrada.
    expect(serie.puntos[0].objetivoKg).toBe(210)
  })

  it('sin gdp objetivo configurado no se inventa una trayectoria', async () => {
    const serie = await serieDePesoPromedio(loteId, '2026-03-01')
    expect(serie.puntos[0].objetivoKg).toBeNull()
  })

  it('una tanda anulada desaparece de la curva', async () => {
    await pesar('2026-02-15', { '001': 230, '002': 250 })
    const pesaje = await prisma.pesaje.findFirstOrThrow()
    await prisma.pesaje.update({
      where: { id: pesaje.id },
      data: { anuladoEn: new Date(), motivoAnulacion: 'Se digitó con la cinta equivocada' },
    })

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    expect(serie.puntos).toHaveLength(1)
    expect(serie.puntos[0].fecha).toBe('2026-01-15')
  })

  it('un lote sin animales activos devuelve una curva vacía, no una que reviente', async () => {
    const vacio = await crearLote({ nombre: 'Ceba 02', tipo: 'ceba', fechaApertura: '2026-01-15' })

    const serie = await serieDePesoPromedio(vacio, '2026-03-01')

    expect(serie.puntos).toEqual([])
    expect(serie.animalesDelLote).toBe(0)
  })
})

describe('serieDeAnimal', () => {
  it('arranca en la entrada del animal y agrega un punto por pesaje suyo', async () => {
    await guardarParametro('gdp_objetivo', '800', '2026-01-01', 'u1')
    await pesar('2026-02-15', { '001': 230, '002': 250 })

    const serie = await serieDeAnimal(ids['001'], '2026-03-01')

    expect(serie.animalesDelLote).toBe(1)
    expect(serie.puntos).toHaveLength(2)
    expect(serie.puntos[0]).toMatchObject({ fecha: '2026-01-15', pesoPromedioKg: 200 })
    expect(serie.puntos[1]).toMatchObject({ fecha: '2026-02-15', pesoPromedioKg: 230, animales: 1 })
    // 31 días a 800 g/día sobre sus 200 kg de entrada, no sobre el promedio
    // del lote: la trayectoria de un animal es la suya.
    expect(serie.puntos[1].objetivoKg).toBe(224.8)
  })

  it('no se contagia de los pesajes de sus compañeros de lote', async () => {
    await pesar('2026-02-15', { '002': 250 })

    const serie = await serieDeAnimal(ids['001'], '2026-03-01')

    expect(serie.puntos).toHaveLength(1)
    expect(serie.puntos[0].fecha).toBe('2026-01-15')
  })

  it('sin gdp objetivo configurado no se inventa una trayectoria', async () => {
    await pesar('2026-02-15', { '001': 230 })
    const serie = await serieDeAnimal(ids['001'], '2026-03-01')
    expect(serie.puntos[1].objetivoKg).toBeNull()
  })
})
