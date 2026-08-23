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
