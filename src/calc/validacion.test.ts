import { describe, expect, it } from 'vitest'
import { validarMedicion } from './validacion'

const entrada = { fecha: '2026-09-01', pesoKg: 150 }

describe('validarMedicion', () => {
  it('acepta un pesaje normal', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-11-01', pesoKg: 199 },
    )
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(806)
  })

  it('acepta el primer pesaje midiendo contra la entrada', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 174 })
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(800)
  })

  it('rechaza un pesaje anterior al ingreso del animal', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-08-15', pesoKg: 150 })
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('anterior al ingreso')
  })

  it('rechaza un peso que no es positivo', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 0 })
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mayor que cero')
  })

  it('rechaza un segundo pesaje el mismo día', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-01', pesoKg: 176 },
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mismo día')
  })

  it('advierte cuando la ganancia diaria supera los dos mil gramos', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-11', pesoKg: 200 },
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('2.600 g/día')
  })

  it('advierte cuando el animal pierde más del diez por ciento', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 170 },
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('perdió')
  })

  it('no advierte por una pérdida pequeña, que es normal en verano', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 195 },
    )
    expect(veredicto.nivel).toBe('ok')
  })
})
