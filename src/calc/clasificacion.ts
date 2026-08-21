export type Clasificacion = 'excelente' | 'bueno' | 'normal' | 'bajo' | 'critico' | 'sin_dato'

/** Cortes en gramos por día. Se leen de la base de datos, nunca se fijan en el código. */
export type Umbrales = {
  excelente: number
  bueno: number
  normal: number
  bajo: number
}

export function clasificar(gdp: number | null, umbrales: Umbrales): Clasificacion {
  if (gdp === null) return 'sin_dato'
  if (gdp >= umbrales.excelente) return 'excelente'
  if (gdp >= umbrales.bueno) return 'bueno'
  if (gdp >= umbrales.normal) return 'normal'
  if (gdp >= umbrales.bajo) return 'bajo'
  return 'critico'
}
