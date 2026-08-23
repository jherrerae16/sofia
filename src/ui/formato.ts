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
