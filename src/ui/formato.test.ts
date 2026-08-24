import { describe, expect, it } from 'vitest'
import {
  capitalizar,
  formatearGdp,
  formatearHectareas,
  formatearKg,
  formatearFecha,
  formatearFechaCorta,
  formatearPesos,
  separarUnidad,
  SIN_DATO,
} from './formato'

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

describe('capitalizar', () => {
  it('sube a mayúscula solo la primera letra', () => {
    expect(capitalizar('cinta bovinométrica')).toBe('Cinta bovinométrica')
  })

  it('respeta una tilde en la primera letra', () => {
    expect(capitalizar('báscula')).toBe('Báscula')
  })

  it('no toca una cadena vacía', () => {
    expect(capitalizar('')).toBe('')
  })
})

describe('separarUnidad', () => {
  it('parte la cifra de su unidad', () => {
    expect(separarUnidad(formatearKg(3892))).toEqual({ valor: '3.892,0', unidad: 'kg' })
  })

  it('la unidad de la ganancia diaria lleva su barra completa', () => {
    expect(separarUnidad(formatearGdp(692))).toEqual({ valor: '692', unidad: 'g/día' })
  })

  it('el guion de "sin dato" no se parte ni se le inventa una unidad', () => {
    expect(separarUnidad(SIN_DATO)).toEqual({ valor: SIN_DATO })
  })

  it('una cifra sin unidad se devuelve entera', () => {
    expect(separarUnidad('14')).toEqual({ valor: '14' })
  })
})

describe('formatearFecha', () => {
  it('escribe la fecha como la lee un ganadero, no como la guarda la base', () => {
    expect(formatearFecha('2026-08-23')).toBe('23 ago 2026')
  })

  it('no se corre un día por la zona horaria', () => {
    // `new Date('2026-01-01')` se interpreta como medianoche UTC, que en
    // Bogotá (UTC-5) es el 31 de diciembre. Toda la plataforma trata las
    // fechas como cadenas 'YYYY-MM-DD' justamente para no depender de la zona
    // horaria; el formateador no puede ser la excepción.
    expect(formatearFecha('2026-01-01')).toBe('1 ene 2026')
    expect(formatearFecha('2026-12-31')).toBe('31 dic 2026')
  })

  it('la versión corta deja el año fuera, para donde no cabe', () => {
    expect(formatearFechaCorta('2026-08-23')).toBe('23 ago')
  })

  it('una fecha ausente no se inventa', () => {
    expect(formatearFecha(null)).toBe(SIN_DATO)
    expect(formatearFechaCorta(null)).toBe(SIN_DATO)
  })
})
