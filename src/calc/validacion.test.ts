import { describe, expect, it } from 'vitest'
import { validarMedicion } from './validacion'

const entrada = { fecha: '2026-09-01', pesoKg: 150 }
// Posterior a todas las fechas de pesaje usadas en este archivo, para que el
// nuevo rechazo por fecha futura no interfiera con los casos que no lo prueban.
const HOY = '2026-11-05'

describe('validarMedicion', () => {
  it('acepta un pesaje normal', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-11-01', pesoKg: 199 },
      HOY,
    )
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(806)
  })

  it('acepta el primer pesaje midiendo contra la entrada', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 174 }, HOY)
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(800)
  })

  it('rechaza un pesaje anterior al ingreso del animal', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-08-15', pesoKg: 150 }, HOY)
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('anterior al ingreso')
  })

  it('rechaza un peso que no es positivo', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 0 }, HOY)
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mayor que cero')
  })

  it('rechaza un peso que no es un número, como el que deja un texto mal digitado', () => {
    const veredicto = validarMedicion(
      entrada,
      null,
      { fecha: '2026-10-01', pesoKg: Number('17o') },
      HOY,
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mayor que cero')
    expect(veredicto.gdp).toBeNull()
  })

  it('rechaza un segundo pesaje el mismo día', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-01', pesoKg: 176 },
      HOY,
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mismo día')
  })

  it('advierte cuando la ganancia diaria supera los dos mil gramos', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-11', pesoKg: 200 },
      HOY,
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('2.600 g/día')
  })

  it('advierte cuando el animal pierde más del diez por ciento', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 170 },
      HOY,
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('perdió')
  })

  it('no advierte por una pérdida pequeña, que es normal en verano', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 195 },
      HOY,
    )
    expect(veredicto.nivel).toBe('ok')
  })

  it('rechaza una fecha de pesaje posterior a hoy', () => {
    // Escribir 2027 en vez de 2026: el error clásico de enero. gdp a mano,
    // por si el rechazo fallara: gdpEntre(202@2026-11-01, 210@2027-11-01) =
    // (210-202)*1000/365 = 21.9... -> 22 (no debe llegar a mostrarse).
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-11-01', pesoKg: 202 },
      { fecha: '2027-11-01', pesoKg: 210 },
      '2026-11-15',
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('posterior a hoy')
    expect(veredicto.gdp).toBeNull()
  })
})
