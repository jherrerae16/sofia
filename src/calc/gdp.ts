import { diasEntre } from './fechas'
import type { FechaISO } from './tipos'

export type Medicion = { fecha: FechaISO; pesoKg: number }

/**
 * Ganancia diaria de peso en gramos por día entre dos mediciones del mismo animal.
 * Devuelve null cuando no hay un intervalo de días válido: sin días transcurridos
 * no hay ganancia diaria, y devolver cero sería afirmar algo que no se midió.
 */
export function gdpEntre(anterior: Medicion, actual: Medicion): number | null {
  const dias = diasEntre(anterior.fecha, actual.fecha)
  if (dias <= 0) return null
  return Math.round(((actual.pesoKg - anterior.pesoKg) * 1000) / dias)
}

/** Ganancia diaria acumulada desde el ingreso del animal a la finca. */
export function gdpAcumulada(entrada: Medicion, actual: Medicion): number | null {
  return gdpEntre(entrada, actual)
}
