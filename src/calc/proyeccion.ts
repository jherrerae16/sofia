import { sumarDias } from './fechas'
import type { FechaISO } from './tipos'

/**
 * Proyecta el peso futuro con la ganancia OBSERVADA del animal, no con la objetivo.
 * Proyectar con la meta produciría una finca que siempre cumple en el papel.
 */
export function proyectarPeso(pesoActualKg: number, gdp: number | null, dias: number): number | null {
  if (gdp === null) return null
  return Math.round((pesoActualKg + (gdp * dias) / 1000) * 10) / 10
}

export type LlegadaAObjetivo = { dias: number; fecha: FechaISO }

export function proyectarLlegada(
  pesoActualKg: number,
  objetivoKg: number,
  gdp: number | null,
  desde: FechaISO,
): LlegadaAObjetivo | null {
  if (pesoActualKg >= objetivoKg) return { dias: 0, fecha: desde }
  if (gdp === null || gdp <= 0) return null
  const dias = Math.ceil(((objetivoKg - pesoActualKg) * 1000) / gdp)
  return { dias, fecha: sumarDias(desde, dias) }
}
