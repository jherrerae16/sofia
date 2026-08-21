import { diasEntre } from './fechas'
import type { FechaISO } from './tipos'

export type Carga = { kgPorHa: number; cabezasPorHa: number }

export function calcularCarga(
  pesoVivoTotalKg: number,
  cabezas: number,
  hectareas: number,
): Carga | null {
  if (hectareas <= 0) return null
  return {
    kgPorHa: Math.round(pesoVivoTotalKg / hectareas),
    cabezasPorHa: cabezas / hectareas,
  }
}

export function diasOcupacion(entrada: FechaISO, hoy: FechaISO): number {
  return Math.max(0, diasEntre(entrada, hoy))
}

export function diasDescanso(salida: FechaISO | null, hoy: FechaISO): number | null {
  if (salida === null) return null
  return Math.max(0, diasEntre(salida, hoy))
}

export type EstadoCapacidad = 'holgado' | 'ajustado' | 'sobrecargado'

/**
 * Compara el peso vivo encima del potrero contra su capacidad configurada.
 * Sin capacidad registrada no se puede afirmar sobrecarga, así que devuelve holgado.
 */
export function evaluarCapacidad(pesoVivoTotalKg: number, capacidadKg: number): EstadoCapacidad {
  if (capacidadKg <= 0) return 'holgado'
  const uso = pesoVivoTotalKg / capacidadKg
  if (uso > 1) return 'sobrecargado'
  if (uso >= 0.9) return 'ajustado'
  return 'holgado'
}
