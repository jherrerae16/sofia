import type { FechaISO } from '@/calc/tipos'

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const SIN_DATO = '—'

export function formatearGdp(gdp: number | null): string {
  if (gdp === null) return SIN_DATO
  return `${enteros.format(gdp)} g/día`
}

export function formatearKg(kg: number | null): string {
  if (kg === null) return SIN_DATO
  return `${unDecimal.format(kg)} kg`
}

export function formatearPesos(cop: number): string {
  return `$${enteros.format(cop)}`
}

/** Hectáreas con coma decimal y un decimal fijo, al estilo colombiano: `8` se lee `8,0`. */
export function formatearHectareas(hectareas: number): string {
  return unDecimal.format(hectareas)
}

/**
 * Sube a mayúscula solo la primera letra, sin tocar el resto. Las etiquetas
 * centrales de `src/ui/etiquetas.ts` van en minúscula (para calzar en una
 * frase, como "el evento fue una desparasitación"), pero un `<select>` las
 * necesita con mayúscula inicial -- esta función deriva esa forma sin que
 * ninguna pantalla tenga que mantener una segunda lista con la misma
 * información.
 */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Parte `'3.892,0 kg'` en `{ valor: '3.892,0', unidad: 'kg' }`.
 *
 * La cinta de cifras dibuja la unidad en chico y en gris al lado del número,
 * pero `formatearKg` y `formatearGdp` la devuelven pegada -- y son la única
 * fuente del formato colombiano. Se parte lo que ellas devuelven en vez de
 * mantener un segundo formateador que tarde o temprano se desincroniza.
 */
export function separarUnidad(formateado: string): { valor: string; unidad?: string } {
  if (formateado === SIN_DATO) return { valor: SIN_DATO }
  const corte = formateado.indexOf(' ')
  if (corte === -1) return { valor: formateado }
  return { valor: formateado.slice(0, corte), unidad: formateado.slice(corte + 1) }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Una fecha como la lee un ganadero: «23 ago 2026», no «2026-08-23».
 *
 * No se usa `Intl.DateTimeFormat` sobre `new Date('2026-01-01')` porque esa
 * cadena se interpreta como medianoche UTC, que en Bogotá (UTC-5) cae el 31
 * de diciembre: la fecha se corre un día. Toda la plataforma trata las fechas
 * como cadenas 'YYYY-MM-DD' justamente para no depender de la zona horaria, y
 * el formateador no puede ser la excepción -- así que se parte la cadena y se
 * arma el texto con sus propias piezas.
 */
export function formatearFecha(fecha: FechaISO | null): string {
  if (fecha === null) return SIN_DATO
  const [anio, mes, dia] = fecha.split('-')
  return `${Number(dia)} ${MESES[Number(mes) - 1]} ${anio}`
}

/** La misma fecha sin el año, para columnas y líneas donde no cabe. */
export function formatearFechaCorta(fecha: FechaISO | null): string {
  if (fecha === null) return SIN_DATO
  const [, mes, dia] = fecha.split('-')
  return `${Number(dia)} ${MESES[Number(mes) - 1]}`
}
