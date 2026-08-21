import { describe, expect, it } from 'vitest'
import { promediarGdp } from './lote'

describe('promediarGdp', () => {
  it('promedia solo los animales con dato y reporta el n', () => {
    const resultado = promediarGdp([800, 700, null, 900], 56)
    expect(resultado.promedio).toBe(800)
    expect(resultado.n).toBe(3)
    expect(resultado.total).toBe(56)
  })

  it('reporta la cobertura como fracción de animales medidos', () => {
    const resultado = promediarGdp([800, 700], 4)
    expect(resultado.cobertura).toBe(0.5)
  })

  it('devuelve promedio null cuando ningún animal tiene dato', () => {
    const resultado = promediarGdp([null, null], 10)
    expect(resultado.promedio).toBeNull()
    expect(resultado.n).toBe(0)
    expect(resultado.cobertura).toBe(0)
  })

  it('devuelve promedio null con la lista vacía', () => {
    const resultado = promediarGdp([], 0)
    expect(resultado.promedio).toBeNull()
    expect(resultado.cobertura).toBe(0)
  })

  it('incluye las pérdidas de peso en el promedio', () => {
    const resultado = promediarGdp([800, -200], 2)
    expect(resultado.promedio).toBe(300)
  })

  it('redondea el promedio a gramos enteros', () => {
    const resultado = promediarGdp([800, 801], 2)
    expect(resultado.promedio).toBe(801)
  })
})
