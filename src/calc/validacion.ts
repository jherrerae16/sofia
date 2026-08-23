import { diasEntre } from './fechas'
import { gdpEntre, type Medicion } from './gdp'
import type { FechaISO } from './tipos'

export type Nivel = 'ok' | 'advertencia' | 'rechazo'
export type Veredicto = { nivel: Nivel; mensaje: string; gdp: number | null }

const GDP_MAXIMA_CREIBLE = 2000
const PERDIDA_MAXIMA_TOLERADA = 0.1

const formato = new Intl.NumberFormat('es-CO')

/**
 * Evalúa un peso -- digitado en un pesaje o registrado en una salida --
 * contra el historial del animal.
 *
 * Rechaza lo imposible y advierte lo improbable, pero nunca bloquea lo improbable:
 * un novillo puede de verdad perder peso en el verano colombiano, y un sistema que lo impide
 * obliga a mentirle. Lo que no se puede permitir es que un dedazo entre sin que
 * nadie lo vea.
 *
 * No todas las guardias aplican en todos los contextos: la de "mismo día"
 * (ver `contexto` más abajo) es una regla de la pantalla de Digitar, no una
 * propiedad física del peso.
 */
export function validarMedicion(
  entrada: { fecha: FechaISO; pesoKg: number },
  anterior: Medicion | null,
  nueva: Medicion,
  hoy: FechaISO,
  // 'hacia_adelante' es cómo `revisarTanda` evalúa el tramo hacia la
  // medición posterior ya guardada: ahí `entrada` es en realidad la
  // medición recién digitada, y `referencia` (más abajo) no es un pesaje
  // anterior de verdad. El mensaje de pérdida debe decir la verdad en ese
  // caso: la pérdida es hacia una medición posterior, no desde una anterior.
  sentido: 'normal' | 'hacia_adelante' = 'normal',
  // Distingue en qué pantalla ocurre la medición, no solo "qué parámetro
  // pasar": 'pesaje' es una tanda digitada en la pantalla de Digitar, donde
  // una segunda medición del mismo animal el mismo día casi siempre es un
  // reenvío accidental de la misma fila. 'salida' es el peso de venta, muerte
  // o robo -- un hecho distinto que registra el ganadero, no un segundo
  // pesaje, y que puede compartir fecha con un pesaje real del mismo día (el
  // caso de la feria: se pesa el lote en la mañana y se vende en la tarde).
  // Nombrar el contexto explícitamente, en vez de un booleano suelto como
  // `omitirMismoDia`, es lo que deja claro en cada sitio de llamada A QUÉ
  // pantalla pertenece la comprobación de "mismo día" -- no es una excepción
  // ad hoc para las ventas, es que esa regla nunca aplicó a un hecho que no
  // es un pesaje.
  contexto: 'pesaje' | 'salida' = 'pesaje',
): Veredicto {
  // Un texto no numérico digitado por error (p. ej. "17o" en vez de "170")
  // se convierte en NaN antes de llegar aquí. Se distingue del caso "cero o
  // negativo" porque el mensaje correcto es otro: no es que el peso sea
  // menor o igual a cero, es que no es un número en absoluto. Sin este
  // chequeo, `NaN <= 0` es `false` y colaría como nivel 'ok' con una
  // ganancia diaria también NaN.
  if (!Number.isFinite(nueva.pesoKg)) {
    return { nivel: 'rechazo', mensaje: 'El peso digitado no es un número.', gdp: null }
  }
  if (nueva.pesoKg <= 0) {
    return { nivel: 'rechazo', mensaje: 'El peso debe ser mayor que cero.', gdp: null }
  }

  if (diasEntre(entrada.fecha, nueva.fecha) < 0) {
    return {
      nivel: 'rechazo',
      mensaje: `La fecha del pesaje es anterior al ingreso del animal (${entrada.fecha}).`,
      gdp: null,
    }
  }

  // El error clásico de enero: escribir el año que viene en vez del actual.
  // Un pesaje "del futuro" no solo muestra una ganancia diaria absurda (o
  // negativa): además apaga durante meses la alarma de frescura, que mide
  // los días desde el último dato contando hacia hoy.
  if (diasEntre(hoy, nueva.fecha) > 0) {
    return {
      nivel: 'rechazo',
      mensaje: `La fecha del pesaje es posterior a hoy (${hoy}).`,
      gdp: null,
    }
  }

  const referencia = anterior ?? entrada

  if (contexto === 'pesaje' && anterior && diasEntre(anterior.fecha, nueva.fecha) === 0) {
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
    const mensaje =
      sentido === 'hacia_adelante'
        ? `El animal perdería ${kilos} kg hacia el pesaje ya registrado del ${nueva.fecha}.`
        : `El animal perdió ${kilos} kg desde el pesaje anterior.`
    return { nivel: 'advertencia', mensaje, gdp }
  }

  return { nivel: 'ok', mensaje: '', gdp }
}

// Rango creíble para el peso de ENTRADA de un novillo de ceba en Colombia.
// Aquí no hay una medición anterior contra la cual comparar -- es el primer
// dato del animal -- así que la guardia no puede ser una ganancia entre dos
// pesajes (como arriba): tiene que ser un rango absoluto sobre el peso
// mismo, con la misma doctrina de siempre: rechaza lo imposible, advierte lo
// improbable.
//
// Los límites de "imposible" están puestos bien holgados a propósito, muy
// por fuera de cualquier compra real de Santa Verónica, para no bloquear un
// caso legítimo que el sistema todavía no conoce:
// - por debajo de 40 kg: ni un ternero recién nacido pesa tan poco --
//   un animal que ya se está chapeteando y dando de alta en un lote de ceba
//   fue destetado, no es un recién nacido.
// - por encima de 1000 kg: supera al toro adulto más pesado que existe en
//   pie (los récords mundiales de peso vivo bovino rondan 1400 kg, pero son
//   toros de exhibición, no un novillo de entrada a ceba). 2200 kg -- el
//   dedazo típico sobre 220 -- cae claramente aquí.
const PESO_ENTRADA_MIN_IMPOSIBLE = 40
const PESO_ENTRADA_MAX_IMPOSIBLE = 1000

// Fuera de este rango más angosto es infrecuente para un novillo de entrada
// -- en Colombia, la ceba suele recibir animales de levante entre unos 130 y
// 550 kg -- pero no imposible: un ternero destetado liviano o un novillo ya
// crecido comprado para ceba corta existen de verdad. Advierte, no rechaza.
const PESO_ENTRADA_MIN_IMPROBABLE = 130
const PESO_ENTRADA_MAX_IMPROBABLE = 550

/**
 * Evalúa el peso de ENTRADA de un animal -- el primer dato de su ficha, del
 * que se derivan todos los kilos producidos del ciclo. Si entra inflado, la
 * producción entera, y el costo por kilo, salen mal sin que nada avise.
 *
 * A diferencia de `validarMedicion`, no recibe un pesaje anterior: no lo
 * hay. Comparte la misma doctrina (rechaza lo imposible, advierte lo
 * improbable) contra un rango absoluto en vez de una ganancia diaria.
 */
export function validarPesoEntrada(pesoKg: number): Veredicto {
  if (!Number.isFinite(pesoKg)) {
    return { nivel: 'rechazo', mensaje: 'El peso de entrada no es un número.', gdp: null }
  }
  if (pesoKg <= 0) {
    return { nivel: 'rechazo', mensaje: 'El peso de entrada debe ser mayor que cero.', gdp: null }
  }
  if (pesoKg < PESO_ENTRADA_MIN_IMPOSIBLE || pesoKg > PESO_ENTRADA_MAX_IMPOSIBLE) {
    return {
      nivel: 'rechazo',
      mensaje: `El peso de entrada (${formato.format(pesoKg)} kg) no es creíble para un bovino. Revisa que esté bien digitado.`,
      gdp: null,
    }
  }
  if (pesoKg < PESO_ENTRADA_MIN_IMPROBABLE || pesoKg > PESO_ENTRADA_MAX_IMPROBABLE) {
    return {
      nivel: 'advertencia',
      mensaje: `Peso de entrada inusual: ${formato.format(pesoKg)} kg. Revisa que esté bien digitado.`,
      gdp: null,
    }
  }
  return { nivel: 'ok', mensaje: '', gdp: null }
}

const RANGO_NIVEL: Record<Nivel, number> = { ok: 0, advertencia: 1, rechazo: 2 }

/**
 * El más grave de dos veredictos sobre el mismo pesaje. Se usa para combinar
 * la evaluación del tramo hacia atrás con la del tramo hacia adelante: un
 * pesaje digitado con retraso puede verse perfectamente normal contra la
 * medición anterior y a la vez ser imposible contra la que ya existía
 * después. Cualquiera de los dos tramos que dispare la alarma debe ganar.
 */
export function veredictoMasGrave(a: Veredicto, b: Veredicto): Veredicto {
  return RANGO_NIVEL[b.nivel] > RANGO_NIVEL[a.nivel] ? b : a
}
