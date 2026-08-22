import { describe, expect, it } from 'vitest'
import { formatearGdp, formatearHectareas, formatearKg, formatearPesos } from './formato'

describe('formatearGdp', () => {
  it('muestra gramos por día con separador de miles', () => {
    expect(formatearGdp(1250)).toBe('1.250 g/día')
  })

  it('muestra una raya cuando no hay dato', () => {
    expect(formatearGdp(null)).toBe('—')
  })

  it('conserva el signo de una pérdida', () => {
    expect(formatearGdp(-200)).toBe('-200 g/día')
  })
})

describe('formatearKg', () => {
  it('muestra un decimal', () => {
    expect(formatearKg(226.4)).toBe('226,4 kg')
  })

  it('muestra una raya cuando no hay dato', () => {
    expect(formatearKg(null)).toBe('—')
  })
})

describe('formatearPesos', () => {
  it('muestra pesos colombianos sin decimales', () => {
    expect(formatearPesos(54760000)).toBe('$54.760.000')
  })
})

describe('formatearHectareas', () => {
  it('usa coma decimal, al estilo colombiano', () => {
    expect(formatearHectareas(7.5)).toBe('7,5')
  })

  it('fija un decimal aunque el número sea entero', () => {
    expect(formatearHectareas(8)).toBe('8,0')
  })
})
