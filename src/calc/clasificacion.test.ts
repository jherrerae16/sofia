import { describe, expect, it } from 'vitest'
import { clasificar, type Umbrales } from './clasificacion'

const umbrales: Umbrales = { excelente: 900, bueno: 750, normal: 600, bajo: 400 }

describe('clasificar', () => {
  it('clasifica como excelente en el umbral exacto', () => {
    expect(clasificar(900, umbrales)).toBe('excelente')
  })

  it('clasifica como bueno justo debajo de excelente', () => {
    expect(clasificar(899, umbrales)).toBe('bueno')
  })

  it('clasifica como normal', () => {
    expect(clasificar(640, umbrales)).toBe('normal')
  })

  it('clasifica como bajo rendimiento', () => {
    expect(clasificar(450, umbrales)).toBe('bajo')
  })

  it('clasifica como crítico por debajo del umbral bajo', () => {
    expect(clasificar(399, umbrales)).toBe('critico')
  })

  it('clasifica como crítico cuando el animal pierde peso', () => {
    expect(clasificar(-200, umbrales)).toBe('critico')
  })

  it('devuelve sin_dato cuando no hay ganancia calculable', () => {
    expect(clasificar(null, umbrales)).toBe('sin_dato')
  })

  it('respeta umbrales distintos a los de arranque', () => {
    const propios: Umbrales = { excelente: 1000, bueno: 850, normal: 700, bajo: 500 }
    expect(clasificar(900, propios)).toBe('bueno')
  })
})
