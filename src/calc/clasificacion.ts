/**
 * Un animal solo puede estar en tres situaciones, no en cinco.
 *
 * Antes había cuatro umbrales (excelente, bueno, normal, bajo) que el dueño
 * tenía que inventarse, y que en la práctica solo servían para decidir quién
 * salía marcado. La regla que él quiere es la que ya tenía en la cabeza: por
 * encima de la meta que se propuso, el animal va bien; por debajo, es alerta.
 */
export type Clasificacion = 'bien' | 'quedado' | 'sin_dato'

/**
 * @param gdp Ganancia diaria observada, en gramos por día. Null si todavía no
 *   hay dos pesajes con que calcularla.
 * @param metaGdp La meta que fijó el dueño. Null si no la ha fijado -- y sin
 *   meta no se clasifica: decir que un animal "va quedado" sin un número
 *   contra el cual medirlo sería una opinión de la plataforma, no suya.
 */
export function clasificar(gdp: number | null, metaGdp: number | null): Clasificacion {
  if (gdp === null || metaGdp === null) return 'sin_dato'
  // Alcanzar la meta es cumplirla: la comparación va con "mayor o igual".
  return gdp >= metaGdp ? 'bien' : 'quedado'
}
