import { clasificar, type Clasificacion } from '@/calc/clasificacion'
import { diasEntre } from '@/calc/fechas'
import { gdpAcumulada, gdpEntre, type Medicion } from '@/calc/gdp'
import { promediarGdp, type ResumenPromedio } from '@/calc/lote'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aKg } from './conversion'
import { leerUmbrales } from './parametros'
import { historialDeAnimal } from './pesajes'

export type Periodo = 'ultimo_pesaje' | 'dias_30' | 'dias_60' | 'dias_90' | 'acumulado'

const PERIODOS_VALIDOS: readonly Periodo[] = [
  'ultimo_pesaje',
  'dias_30',
  'dias_60',
  'dias_90',
  'acumulado',
]

/**
 * Valida el periodo recibido de la URL contra la lista de periodos conocidos.
 *
 * Un tipo (`Periodo`) es una afirmación en tiempo de compilación, no una
 * garantía en tiempo de ejecución: la dirección web puede traer cualquier
 * texto. Sin esta validación, un valor que no coincide con ninguna clave de
 * `VENTANA` deja la ventana de días indefinida, todas las comparaciones dan
 * falso y `referencia` retrocede en silencio a la ganancia acumulada
 * disfrazada de ganancia del periodo. Cae a 'ultimo_pesaje' cuando no coincide.
 */
export function normalizarPeriodo(valor: string | undefined): Periodo {
  return (PERIODOS_VALIDOS as readonly string[]).includes(valor ?? '')
    ? (valor as Periodo)
    : 'ultimo_pesaje'
}

const VENTANA: Record<Exclude<Periodo, 'ultimo_pesaje' | 'acumulado'>, number> = {
  dias_30: 30,
  dias_60: 60,
  dias_90: 90,
}

export type FilaDesempeno = {
  animalId: string
  chapeta: string
  lote: string
  pesoActualKg: number | null
  fechaUltimoPesaje: FechaISO | null
  kgGanados: number | null
  gdpPeriodo: number | null
  gdpAcumulada: number | null
  clasificacion: Clasificacion
  diasEnFinca: number
}

/**
 * Elige contra qué medición se compara el último peso, según el periodo pedido.
 * Para las ventanas de días se usa el pesaje más viejo dentro de la ventana:
 * comparar contra uno anterior a la ventana mediría un tramo que no se pidió.
 *
 * Cuando hay menos de dos pesajes dentro de la ventana, no hay dos puntos
 * propios de la ventana con que medir un tramo, y la función retrocede
 * deliberadamente al último pesaje anterior a ella (o a la entrada, si
 * tampoco hay ninguno). Con un solo pesaje dentro de la ventana, ese
 * respaldo sí mide un tramo real de días. Con ninguno, el respaldo puede
 * coincidir con `ultimo` (la misma medición contra sí misma): `gdpEntre` lo
 * detecta por los cero días transcurridos y devuelve null en vez de un gdp
 * inventado, y el animal queda 'sin_dato' en vez de acusado de crítico.
 */
function referencia(
  historial: Medicion[],
  entrada: Medicion,
  periodo: Periodo,
  hoy: FechaISO,
): Medicion | null {
  if (historial.length === 0) return null
  if (periodo === 'acumulado') return entrada
  if (periodo === 'ultimo_pesaje') return historial.at(-2) ?? entrada

  const dias = VENTANA[periodo]
  const dentro = historial.filter((m) => diasEntre(m.fecha, hoy) <= dias)
  const anteriores = historial.filter((m) => diasEntre(m.fecha, hoy) > dias)
  if (dentro.length >= 2) return dentro[0]
  return anteriores.at(-1) ?? entrada
}

export async function desempeno(
  periodo: Periodo,
  hoy: FechaISO,
): Promise<{ filas: FilaDesempeno[]; resumen: ResumenPromedio }> {
  const umbrales = await leerUmbrales(hoy)

  const animales = await prisma.animal.findMany({
    where: { estado: 'activo', lote: { tipo: 'ceba' } },
    include: { lote: { select: { nombre: true } } },
    orderBy: { chapeta: 'asc' },
  })

  const filas: FilaDesempeno[] = await Promise.all(
    animales.map(async (animal) => {
      const entrada: Medicion = {
        fecha: aFechaISO(animal.fechaEntrada),
        pesoKg: aKg(animal.pesoEntradaKg),
      }
      const historial = await historialDeAnimal(animal.id)
      const ultimo = historial.at(-1) ?? null
      const base = referencia(historial, entrada, periodo, hoy)

      const gdpPeriodo = ultimo && base ? gdpEntre(base, ultimo) : null
      const acumulada = ultimo ? gdpAcumulada(entrada, ultimo) : null

      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        lote: animal.lote.nombre,
        pesoActualKg: ultimo?.pesoKg ?? null,
        fechaUltimoPesaje: ultimo?.fecha ?? null,
        kgGanados: ultimo ? Math.round((ultimo.pesoKg - entrada.pesoKg) * 10) / 10 : null,
        gdpPeriodo,
        gdpAcumulada: acumulada,
        clasificacion: clasificar(gdpPeriodo, umbrales),
        diasEnFinca: diasEntre(entrada.fecha, hoy),
      }
    }),
  )

  const resumen = promediarGdp(
    filas.map((f) => (periodo === 'acumulado' ? f.gdpAcumulada : f.gdpPeriodo)),
    filas.length,
  )

  return { filas, resumen }
}
