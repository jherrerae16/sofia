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

/**
 * Convierte un instante UTC (como el `Date` que Prisma devuelve para una
 * columna `timestamp`, p. ej. `anuladoEn` o `creadoEn`) a un `Date` cuyos
 * campos UTC son la hora de pared de Bogotá para ese instante.
 *
 * Existe para bibliotecas que serializan un `Date` leyendo sus campos UTC en
 * vez de los de la zona horaria del proceso -- como `write-excel-file` (ver
 * `celdaFechaHora` en `src/app/exportar/construirLibro.ts`). Sin esta
 * conversión, la celda queda escrita en horario UTC mientras el resto del
 * archivo (las fechas de día, el nombre del archivo) usa hora de la finca,
 * y cualquier anulación o registro hecho después de las 7 p. m. queda
 * fechado al día siguiente.
 */
export function aFechaHoraBogota(instante: Date): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante)
  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value)
  return new Date(
    Date.UTC(parte('year'), parte('month') - 1, parte('day'), parte('hour'), parte('minute'), parte('second')),
  )
}
