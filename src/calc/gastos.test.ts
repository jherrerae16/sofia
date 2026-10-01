import { describe, expect, it } from 'vitest'
import { leerValorEnPesos, mesDe, nombreDelMes, totalesPorMes } from './gastos'

describe('totalesPorMes', () => {
  it('suma por mes, sin contar los anulados, del más reciente al más viejo', () => {
    const totales = totalesPorMes(
      [
        { fecha: '2026-09-30', valor: 2_800_000, anulado: false },
        { fecha: '2026-09-15', valor: 240_000, anulado: false },
        { fecha: '2026-09-15', valor: 240_000, anulado: true },
        { fecha: '2026-08-27', valor: 298_700, anulado: false },
      ],
      '2026-09',
    )
    expect(totales).toEqual([
      { mes: '2026-09', total: 3_040_000, gastos: 2 },
      { mes: '2026-08', total: 298_700, gastos: 1 },
    ])
  })

  it('el mes de hoy aparece siempre, aunque no tenga gastos', () => {
    expect(totalesPorMes([{ fecha: '2026-09-30', valor: 100, anulado: false }], '2026-10')).toEqual([
      { mes: '2026-10', total: 0, gastos: 0 },
      { mes: '2026-09', total: 100, gastos: 1 },
    ])
  })

  it('un mes con solo gastos anulados sigue apareciendo, en cero', () => {
    expect(totalesPorMes([{ fecha: '2026-08-01', valor: 100, anulado: true }], '2026-09')).toEqual([
      { mes: '2026-09', total: 0, gastos: 0 },
      { mes: '2026-08', total: 0, gastos: 0 },
    ])
  })
})

describe('mesDe y nombreDelMes', () => {
  it('saca el mes de una fecha y lo nombra en español', () => {
    expect(mesDe('2026-10-01')).toBe('2026-10')
    expect(nombreDelMes('2026-09')).toBe('Septiembre 2026')
    expect(nombreDelMes('2027-01')).toBe('Enero 2027')
  })
})

describe('leerValorEnPesos', () => {
  it('acepta el valor con puntos de miles, con signo de pesos o con espacios', () => {
    expect(leerValorEnPesos('2.800.000')).toBe(2_800_000)
    expect(leerValorEnPesos('$ 312.400')).toBe(312_400)
    expect(leerValorEnPesos('95000')).toBe(95_000)
  })

  it('rechaza lo que no es un valor entero positivo', () => {
    expect(leerValorEnPesos('')).toBeNull()
    expect(leerValorEnPesos('0')).toBeNull()
    expect(leerValorEnPesos('-5000')).toBeNull()
    expect(leerValorEnPesos('12,50')).toBeNull()
    expect(leerValorEnPesos('mil')).toBeNull()
    expect(leerValorEnPesos('99999999999')).toBeNull()
  })
})
