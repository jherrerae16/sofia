import { describe, expect, it } from 'vitest'
import { calcularCarga, diasDescanso, diasOcupacion, evaluarCapacidad } from './potrero'

describe('calcularCarga', () => {
  it('calcula kilos vivos y cabezas por hectárea', () => {
    const carga = calcularCarga(11200, 56, 35)
    expect(carga).not.toBeNull()
    expect(carga!.kgPorHa).toBe(320)
    expect(carga!.cabezasPorHa).toBeCloseTo(1.6, 2)
  })

  it('devuelve null si el potrero no tiene hectáreas registradas', () => {
    expect(calcularCarga(11200, 56, 0)).toBeNull()
  })

  it('devuelve cero cuando el potrero está vacío', () => {
    const carga = calcularCarga(0, 0, 35)
    expect(carga!.kgPorHa).toBe(0)
    expect(carga!.cabezasPorHa).toBe(0)
  })
})

describe('diasOcupacion', () => {
  it('cuenta los días desde que entró el lote', () => {
    expect(diasOcupacion('2026-09-01', '2026-09-21')).toBe(20)
  })

  it('devuelve cero el mismo día de la entrada', () => {
    expect(diasOcupacion('2026-09-01', '2026-09-01')).toBe(0)
  })
})

describe('diasDescanso', () => {
  it('cuenta los días desde que salió el último lote', () => {
    expect(diasDescanso('2026-08-01', '2026-09-21')).toBe(51)
  })

  it('devuelve null si el potrero nunca ha sido ocupado', () => {
    expect(diasDescanso(null, '2026-09-21')).toBeNull()
  })
})

describe('evaluarCapacidad', () => {
  it('marca holgado por debajo del noventa por ciento', () => {
    expect(evaluarCapacidad(8000, 10000)).toBe('holgado')
  })

  it('marca ajustado entre el noventa y el cien por ciento', () => {
    expect(evaluarCapacidad(9500, 10000)).toBe('ajustado')
  })

  it('marca sobrecargado al pasar la capacidad', () => {
    expect(evaluarCapacidad(10080, 10000)).toBe('sobrecargado')
  })

  it('marca holgado si no hay capacidad registrada', () => {
    expect(evaluarCapacidad(10080, 0)).toBe('holgado')
  })

  it('marca ajustado, no sobrecargado, al 100 % clavado -- la finca ya tuvo un caso real al 100,8 %', () => {
    expect(evaluarCapacidad(10000, 10000)).toBe('ajustado')
  })

  it('marca sobrecargado con un solo kilo de más sobre la capacidad', () => {
    expect(evaluarCapacidad(10001, 10000)).toBe('sobrecargado')
  })
})
