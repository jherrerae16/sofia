import { describe, expect, it } from 'vitest'
import { diasEntre, sumarDias } from './fechas'

describe('diasEntre', () => {
  it('cuenta los días entre dos fechas', () => {
    expect(diasEntre('2026-09-01', '2026-10-01')).toBe(30)
  })

  it('devuelve cero para la misma fecha', () => {
    expect(diasEntre('2026-09-01', '2026-09-01')).toBe(0)
  })

  it('cuenta correctamente a través de un cambio de año', () => {
    expect(diasEntre('2026-12-15', '2027-02-15')).toBe(62)
  })

  it('devuelve negativo si la fecha final es anterior', () => {
    expect(diasEntre('2026-10-01', '2026-09-01')).toBe(-30)
  })

  it('no se desfasa por horario de verano ni por zona horaria', () => {
    expect(diasEntre('2026-03-01', '2026-04-01')).toBe(31)
  })
})

describe('sumarDias', () => {
  it('suma días cruzando el fin de mes', () => {
    expect(sumarDias('2026-09-25', 10)).toBe('2026-10-05')
  })

  it('acepta cero', () => {
    expect(sumarDias('2026-09-25', 0)).toBe('2026-09-25')
  })
})
