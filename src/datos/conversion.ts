import type { Prisma } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'

/**
 * Las columnas `@db.Date` de Postgres vuelven como medianoche UTC.
 * Recortar la cadena ISO es exacto y no toca la zona horaria local.
 */
export function aFechaISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10)
}

export function aFechaDb(fecha: FechaISO): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

/** Los Decimal de Prisma no son números de JavaScript. Se convierten en la frontera. */
export function aNumero(valor: Prisma.Decimal): number {
  return Number(valor)
}

/** Alias con nombre de dominio para las columnas de peso. */
export const aKg = aNumero
