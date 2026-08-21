import { describe, expect, it } from 'vitest'
import { gdpAcumulada, gdpEntre } from './gdp'

describe('gdpEntre', () => {
  it('calcula gramos por día entre dos pesajes', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2026-10-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBe(800)
  })

  it('devuelve negativo cuando el animal perdió peso', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 180 }
    const actual = { fecha: '2026-10-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBe(-200)
  })

  it('devuelve null si no pasó ningún día', () => {
    const misma = { fecha: '2026-09-01', pesoKg: 150 }
    expect(gdpEntre(misma, { fecha: '2026-09-01', pesoKg: 152 })).toBeNull()
  })

  it('devuelve null si el pesaje actual es anterior al previo', () => {
    const anterior = { fecha: '2026-10-01', pesoKg: 150 }
    const actual = { fecha: '2026-09-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBeNull()
  })

  it('redondea a gramos enteros', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2026-09-08', pesoKg: 155.3 }
    expect(gdpEntre(anterior, actual)).toBe(757)
  })
})

describe('gdpAcumulada', () => {
  it('mide contra el peso de entrada del animal', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2027-02-01', pesoKg: 276 }
    expect(gdpAcumulada(entrada, actual)).toBe(824)
  })

  it('devuelve null el día de la entrada', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    expect(gdpAcumulada(entrada, { fecha: '2026-09-01', pesoKg: 150 })).toBeNull()
  })
})
