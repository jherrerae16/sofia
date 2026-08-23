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

  it('rechaza un peso que no es un número, como el que deja un texto mal digitado, con un mensaje propio', () => {
    // "El peso debe ser mayor que cero" es correcto para 0 o negativos, pero
    // confuso para un texto mal digitado: no es que el peso sea "menor o
    // igual a cero", es que no es un número en absoluto.
    const veredicto = validarMedicion(
      entrada,
      null,
      { fecha: '2026-10-01', pesoKg: Number('17o') },
      HOY,
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('no es un número')
    expect(veredicto.mensaje).not.toContain('mayor que cero')
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

  it('en contexto "salida", no rechaza un peso el mismo día de un pesaje real -- es otro hecho, no un segundo pesaje digitado', () => {
    // Mismo caso que "rechaza un segundo pesaje el mismo día" de arriba,
    // pero visto desde una venta: el peso de venta del día de la feria no
    // es un reintento de digitación, es un hecho distinto que ocurre el
    // mismo día del pesaje de la mañana. La regla de "mismo día" solo tiene
    // sentido en la pantalla de digitar, donde evita duplicar una fila.
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-01', pesoKg: 176 },
      HOY,
      'normal',
      'salida',
    )
    expect(veredicto.nivel).toBe('ok')
  })

  it('en contexto "salida", sin transcurrir un día no hay ganancia diaria que evaluar, pero sigue rechazando lo demás (peso no positivo)', () => {
    // El contexto "salida" apaga SOLO la regla de "mismo día" -- las demás
    // (peso no numérico, no positivo, fecha antes del ingreso, fecha
    // futura) siguen intactas.
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-01', pesoKg: 0 },
      HOY,
      'normal',
      'salida',
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mayor que cero')
  })

  it('en contexto "salida", una ganancia imposible frente al pesaje anterior sigue advirtiendo', () => {
    // El dedazo clásico (2200 en vez de 220) tiene que seguir advirtiendo en
    // una venta con un pesaje anterior de otro día -- el contexto "salida"
    // no apaga la guardia de ganancia imposible, solo la de "mismo día".
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-05', pesoKg: 2200 },
      HOY,
      'normal',
      'salida',
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('Ganancia de')
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

  it('en el tramo hacia adelante, el mensaje de pérdida dice hacia dónde es la pérdida, no "desde el pesaje anterior"', () => {
    // Reproduce cómo `revisarTanda` evalúa el tramo hacia adelante: la
    // medición recién digitada se pasa como "entrada" (sin `anterior`) y se
    // compara contra la que ya existía después. "Desde el pesaje anterior"
    // sería falso aquí: la pérdida es hacia una medición posterior, no desde
    // una anterior.
    const veredicto = validarMedicion(
      { fecha: '2026-10-15', pesoKg: 200 },
      null,
      { fecha: '2026-11-01', pesoKg: 170 },
      HOY,
      'hacia_adelante',
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).not.toContain('desde el pesaje anterior')
    expect(veredicto.mensaje).toContain('2026-11-01')
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
