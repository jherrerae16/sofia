import type { FechaISO } from './tipos'

const MS_POR_DIA = 86_400_000

function aUtc(fecha: FechaISO): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

/** Días calendario entre dos fechas. Negativo si `hasta` es anterior a `desde`. */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_POR_DIA)
}

/** Devuelve la fecha resultante de sumar `dias` a `fecha`. */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const resultado = new Date(aUtc(fecha) + dias * MS_POR_DIA)
  return resultado.toISOString().slice(0, 10)
}

/** La fecha de hoy en la zona horaria de la finca. */
export function hoyBogota(): FechaISO {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date())
}
