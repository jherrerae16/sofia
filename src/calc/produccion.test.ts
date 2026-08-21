import { describe, expect, it } from 'vitest'
import { kgProducidos, type AnimalProduccion } from './produccion'

describe('kgProducidos', () => {
  it('suma la ganancia de los animales activos', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 190 },
    ]
    expect(kgProducidos(animales)).toBe(90)
  })

  it('cuenta los kilos que ganó un animal vendido antes de salir', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'vendido', pesoEntradaKg: 150, pesoUltimoKg: 280 },
    ]
    expect(kgProducidos(animales)).toBe(130)
  })

  it('no cuenta nada de un animal muerto', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'muerto', pesoEntradaKg: 150, pesoUltimoKg: 190 },
    ]
    expect(kgProducidos(animales)).toBe(50)
  })

  it('no cuenta nada de un animal robado', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'robado', pesoEntradaKg: 150, pesoUltimoKg: 210 },
    ]
    expect(kgProducidos(animales)).toBe(0)
  })

  it('ignora al animal que todavía no tiene ningún pesaje', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: null },
    ]
    expect(kgProducidos(animales)).toBe(0)
  })

  it('resta cuando un animal perdió peso', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 140 },
    ]
    expect(kgProducidos(animales)).toBe(40)
  })

  it('devuelve cero sin animales', () => {
    expect(kgProducidos([])).toBe(0)
  })
})
