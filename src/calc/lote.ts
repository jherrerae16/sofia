export type ResumenPromedio = {
  /** Promedio en gramos por día, o null si ningún animal tiene dato. */
  promedio: number | null
  /** Cuántos animales aportaron dato. */
  n: number
  /** Cuántos animales hay en el grupo. */
  total: number
  /** Fracción entre 0 y 1 del grupo que se alcanzó a medir. */
  cobertura: number
}

/**
 * Promedia ganancias diarias ignorando los animales sin dato, pero conservando
 * el n y la cobertura. Un promedio sin su n es una afirmación sin evidencia.
 */
export function promediarGdp(valores: (number | null)[], totalAnimales: number): ResumenPromedio {
  const conDato = valores.filter((v): v is number => v !== null)
  const cobertura = totalAnimales > 0 ? conDato.length / totalAnimales : 0
  if (conDato.length === 0) {
    return { promedio: null, n: 0, total: totalAnimales, cobertura: 0 }
  }
  const suma = conDato.reduce((acumulado, valor) => acumulado + valor, 0)
  return {
    promedio: Math.round(suma / conDato.length),
    n: conDato.length,
    total: totalAnimales,
    cobertura,
  }
}
