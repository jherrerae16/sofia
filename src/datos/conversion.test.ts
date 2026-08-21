import { describe, expect, it } from 'vitest'
import { aFechaDb, aFechaISO } from './conversion'

describe('aFechaISO', () => {
  it('convierte una fecha de la base a cadena YYYY-MM-DD', () => {
    expect(aFechaISO(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026-09-01')
  })

  it('no adelanta un día por la zona horaria de Colombia', () => {
    expect(aFechaISO(new Date('2026-12-31T00:00:00.000Z'))).toBe('2026-12-31')
  })
})

describe('aFechaDb', () => {
  it('convierte una cadena a medianoche UTC', () => {
    expect(aFechaDb('2026-09-01').toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('es la inversa exacta de aFechaISO', () => {
    expect(aFechaISO(aFechaDb('2027-02-28'))).toBe('2027-02-28')
  })
})
