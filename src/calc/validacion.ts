import { diasEntre } from './fechas'
import { gdpEntre, type Medicion } from './gdp'
import type { FechaISO } from './tipos'

export type Nivel = 'ok' | 'advertencia' | 'rechazo'
export type Veredicto = { nivel: Nivel; mensaje: string; gdp: number | null }

const GDP_MAXIMA_CREIBLE = 2000
const PERDIDA_MAXIMA_TOLERADA = 0.1

const formato = new Intl.NumberFormat('es-CO')

/**
 * Evalúa un peso recién digitado contra el historial del animal.
 *
 * Rechaza lo imposible y advierte lo improbable, pero nunca bloquea lo improbable:
 * un novillo puede de verdad perder peso en el verano colombiano, y un sistema que lo impide
 * obliga a mentirle. Lo que no se puede permitir es que un dedazo entre sin que
 * nadie lo vea.
 */
export function validarMedicion(
  entrada: { fecha: FechaISO; pesoKg: number },
  anterior: Medicion | null,
  nueva: Medicion,
): Veredicto {
  // `!Number.isFinite` cubre NaN además de negativos y cero: un texto no
  // numérico digitado por error (p. ej. "17o" en vez de "170") se convierte
  // en NaN antes de llegar aquí, y `NaN <= 0` es `false`, así que sin este
  // chequeo colaría como nivel 'ok' con una ganancia diaria también NaN.
  if (!Number.isFinite(nueva.pesoKg) || nueva.pesoKg <= 0) {
    return { nivel: 'rechazo', mensaje: 'El peso debe ser mayor que cero.', gdp: null }
  }

  if (diasEntre(entrada.fecha, nueva.fecha) < 0) {
    return {
      nivel: 'rechazo',
      mensaje: `La fecha del pesaje es anterior al ingreso del animal (${entrada.fecha}).`,
      gdp: null,
    }
  }

  const referencia = anterior ?? entrada

  if (anterior && diasEntre(anterior.fecha, nueva.fecha) === 0) {
    return {
      nivel: 'rechazo',
      mensaje: 'Ya hay un pesaje de este animal el mismo día.',
      gdp: null,
    }
  }

  const gdp = gdpEntre(referencia, nueva)

  if (gdp !== null && gdp > GDP_MAXIMA_CREIBLE) {
    return {
      nivel: 'advertencia',
      mensaje: `Ganancia de ${formato.format(gdp)} g/día. Revisa que el peso esté bien digitado.`,
      gdp,
    }
  }

  const perdida = (referencia.pesoKg - nueva.pesoKg) / referencia.pesoKg
  if (perdida > PERDIDA_MAXIMA_TOLERADA) {
    const kilos = Math.round((referencia.pesoKg - nueva.pesoKg) * 10) / 10
    return {
      nivel: 'advertencia',
      mensaje: `El animal perdió ${kilos} kg desde el pesaje anterior.`,
      gdp,
    }
  }

  return { nivel: 'ok', mensaje: '', gdp }
}
