import { formatearGdp, formatearHectareas, formatearKg } from '@/ui/formato'

export type DefinicionParametro = {
  clave: string
  titulo: string
  /** En lenguaje de ganadero: qué otras pantallas cambian cuando se cambia este valor. */
  explicacion: string
  unidad: string
  formatear: (numero: number) => string
}

export const DEFINICION_GDP_OBJETIVO: DefinicionParametro = {
  clave: 'gdp_objetivo',
  titulo: 'Meta de ganancia diaria',
  explicacion:
    'Cuántos gramos quieres que gane un novillo cada día. Es el único criterio de la finca: el que llega o pasa esta meta va bien, el que va por debajo sale marcado como quedado en Ganado y en su propia ficha. También es la línea punteada de las dos curvas de peso.',
  unidad: 'g/día',
  formatear: formatearGdp,
}

export const DEFINICION_PESO_OBJETIVO: DefinicionParametro = {
  clave: 'peso_objetivo_venta_kg',
  titulo: 'Peso al que se vende UN novillo',
  explicacion:
    'El peso de un solo animal, no el del lote entero: a partir de aquí ese novillo aparece marcado como listo en Ganado, y el chip «Listos» te dice cuántos ya lo pasaron. Con 320 kg y catorce novillos, el lote pesaría 4.480 kg -- pero ese total no se configura en ninguna parte, sale solo de sumar.',
  unidad: 'kg',
  formatear: formatearKg,
}

/**
 * `formatearHectareas` (usada tal cual en la tabla de potreros, bajo una
 * columna que ya dice "Hectáreas") no agrega la unidad -- a diferencia de
 * `formatearGdp` y `formatearKg`, que sí la traen incluida. La tarjeta de
 * un parámetro no tiene esa columna, así que aquí sí hace falta agregarla.
 */
function formatearHectareasConUnidad(hectareas: number): string {
  return `${formatearHectareas(hectareas)} ha`
}

/**
 * Se movió aquí desde un campo suelto en `Finca` para que llevara vigencia e
 * histórico; desde entonces la carga animal de la portada ya la consume.
 */
export const DEFINICION_HECTAREAS: DefinicionParametro = {
  clave: 'hectareas_utiles',
  titulo: 'Hectáreas útiles de la finca',
  explicacion:
    'Las hectáreas de verdad aprovechables para el ganado, descontando lo improductivo. De aquí sale la carga que ves en Ganado: cuántos kilos vivos hay encima de cada hectárea. Es el número que dice si el pasto aguanta más novillos o si ya está topado.',
  unidad: 'ha',
  formatear: formatearHectareasConUnidad,
}

export const DEFINICIONES_PARAMETRO: DefinicionParametro[] = [
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_PESO_OBJETIVO,
  DEFINICION_HECTAREAS,
]
