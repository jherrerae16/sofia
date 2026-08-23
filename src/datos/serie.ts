import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aKg } from './conversion'
import { leerGdpObjetivo } from './parametros'

export type PuntoSerie = {
  fecha: FechaISO
  pesoPromedioKg: number
  /** Cuántos animales se pesaron ESE día. Es la cobertura, no el divisor. */
  animales: number
  /** A cuánto habrían llegado con el gdp objetivo. Null si no hay objetivo configurado. */
  objetivoKg: number | null
}

export type SerieLote = {
  puntos: PuntoSerie[]
  /** Total de animales activos del lote, para poder decir "cubrió 10 de 14". */
  animalesDelLote: number
}

function redondear(kg: number): number {
  return Math.round(kg * 10) / 10
}

/**
 * La curva de engorde del lote: un punto en la entrada más vieja y uno por
 * cada fecha en que hubo pesaje.
 *
 * En cada punto el promedio incluye a TODOS los animales activos que ya
 * habían entrado a esa fecha, con su peso conocido más reciente. Promediar
 * solo a los que se pesaron ese día haría brincar la curva cuando la tanda no
 * alcanza a todos: si los que faltaron eran los flacos, el promedio sube sin
 * que ningún animal haya engordado y el dueño lee una mejora que no pasó.
 * `animales` sí cuenta solo a los de ese día -- es la cobertura que se avisa
 * al pie de la gráfica, no el divisor del promedio.
 */
export async function serieDePesoPromedio(loteId: string, hoy: FechaISO): Promise<SerieLote> {
  const animales = await prisma.animal.findMany({
    where: { loteId, estado: 'activo' },
    select: { id: true, fechaEntrada: true, pesoEntradaKg: true },
  })
  if (animales.length === 0) return { puntos: [], animalesDelLote: 0 }

  // `pesaje: { anuladoEn: null }`, igual que `historialDeAnimal`: una tanda
  // anulada no puede seguir dibujando la curva.
  const mediciones = await prisma.medicion.findMany({
    where: { animalId: { in: animales.map((a) => a.id) }, pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
  })

  const entradas = new Map(
    animales.map((a) => [
      a.id,
      { fecha: aFechaISO(a.fechaEntrada), pesoKg: aKg(a.pesoEntradaKg) },
    ]),
  )

  const porAnimal = new Map<string, { fecha: FechaISO; pesoKg: number }[]>()
  const pesadosPorFecha = new Map<FechaISO, number>()
  for (const medicion of mediciones) {
    const fecha = aFechaISO(medicion.pesaje.fecha)
    const historial = porAnimal.get(medicion.animalId) ?? []
    historial.push({ fecha, pesoKg: aKg(medicion.pesoKg) })
    porAnimal.set(medicion.animalId, historial)
    pesadosPorFecha.set(fecha, (pesadosPorFecha.get(fecha) ?? 0) + 1)
  }
  for (const historial of porAnimal.values()) {
    historial.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }

  // La entrada más vieja abre la curva; después, una fecha por tanda. Si la
  // primera tanda cayó el mismo día de la entrada, no se duplica el punto.
  const primeraEntrada = [...entradas.values()].map((e) => e.fecha).sort()[0]
  const fechas = [
    primeraEntrada,
    ...[...pesadosPorFecha.keys()].filter((f) => f !== primeraEntrada).sort(),
  ]

  const gdpObjetivo = await leerGdpObjetivo(hoy)

  const puntos = fechas.map((fecha) => {
    // Solo los que ya habían entrado: un animal que llegó en febrero no puede
    // mover el promedio de enero, ni hacia arriba ni hacia abajo.
    const presentes = animales.filter((a) => entradas.get(a.id)!.fecha <= fecha)

    const pesos = presentes.map((a) => {
      const hasta = (porAnimal.get(a.id) ?? []).filter((m) => m.fecha <= fecha)
      return hasta.at(-1)?.pesoKg ?? entradas.get(a.id)!.pesoKg
    })
    const pesoPromedioKg = redondear(pesos.reduce((total, peso) => total + peso, 0) / pesos.length)

    // La trayectoria se calcula sobre los mismos animales presentes: su peso
    // de entrada promedio más lo que habrían ganado en los días que llevan.
    const pesoEntradaPromedio =
      presentes.reduce((total, a) => total + entradas.get(a.id)!.pesoKg, 0) / presentes.length
    const diasPromedio =
      presentes.reduce((total, a) => total + diasEntre(entradas.get(a.id)!.fecha, fecha), 0) /
      presentes.length

    return {
      fecha,
      pesoPromedioKg,
      animales: pesadosPorFecha.get(fecha) ?? 0,
      objetivoKg:
        gdpObjetivo === null
          ? null
          : redondear(pesoEntradaPromedio + (gdpObjetivo / 1000) * diasPromedio),
    }
  })

  return { puntos, animalesDelLote: animales.length }
}
