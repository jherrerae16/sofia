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
