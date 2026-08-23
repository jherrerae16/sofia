import { formatearGdp, formatearHectareas, formatearKg } from '@/ui/formato'

export type DefinicionParametro = {
  clave: string
  titulo: string
  /** En lenguaje de ganadero: qué otras pantallas cambian cuando se cambia este valor. */
  explicacion: string
  unidad: string
  formatear: (numero: number) => string
}

/**
 * Un umbral por debajo del más bajo (`umbral_bajo`) no tiene clave propia:
 * cualquier ganancia menor cae en "crítico" por descarte, en
 * `src/calc/clasificacion.ts`. Por eso el semáforo tiene cinco niveles con
 * solo cuatro números configurables.
 */
export const DEFINICIONES_UMBRAL: DefinicionParametro[] = [
  {
    clave: 'umbral_excelente',
    titulo: 'Umbral "Excelente"',
    explicacion:
      'Un novillo que gana esto o más por día se pinta en el nivel más alto del semáforo -- en la portada, en "Cómo vamos" y en la ficha de cada animal.',
    unidad: 'g/día',
    formatear: formatearGdp,
  },
  {
    clave: 'umbral_bueno',
    titulo: 'Umbral "Bueno"',
    explicacion: 'Por debajo de "Excelente" pero desde aquí para arriba, un novillo se clasifica como "Bueno".',
    unidad: 'g/día',
    formatear: formatearGdp,
  },
  {
    clave: 'umbral_normal',
    titulo: 'Umbral "Normal"',
    explicacion: 'Por debajo de "Bueno" pero desde aquí para arriba, un novillo se clasifica como "Normal".',
    unidad: 'g/día',
    formatear: formatearGdp,
  },
  {
    clave: 'umbral_bajo',
    titulo: 'Umbral "Bajo"',
    explicacion:
      'Por debajo de "Normal" pero desde aquí para arriba, un novillo se clasifica como "Bajo". Por debajo de este número, cae en "Crítico" -- ese nivel no tiene un umbral propio, es todo lo que queda debajo del más bajo de los cuatro.',
    unidad: 'g/día',
    formatear: formatearGdp,
  },
]

export const DEFINICION_GDP_OBJETIVO: DefinicionParametro = {
  clave: 'gdp_objetivo',
  titulo: 'Meta de ganancia diaria',
  explicacion:
    'La ganancia que la finca se propone lograr por animal por día. Es la línea punteada de la curva de peso en la ficha de cada animal, y contra ella se compara el promedio real en "Cómo vamos" y en la portada.',
  unidad: 'g/día',
  formatear: formatearGdp,
}

export const DEFINICION_PESO_OBJETIVO: DefinicionParametro = {
  clave: 'peso_objetivo_venta_kg',
  titulo: 'Peso de venta',
  explicacion: 'El peso al que se considera listo un novillo para vender.',
  unidad: 'kg',
  formatear: formatearKg,
}

/**
 * A diferencia de los seis parámetros de arriba, esta clave no gobierna
 * ningún cálculo todavía -- se movió aquí (desde un campo suelto en `Finca`)
 * precisamente para que, cuando la carga animal empiece a consumirla, ya
 * tenga vigencia e histórico desde el primer día.
 */
export const DEFINICION_HECTAREAS: DefinicionParametro = {
  clave: 'hectareas_utiles',
  titulo: 'Hectáreas útiles de la finca',
  explicacion:
    'Las hectáreas realmente aprovechables para el ganado, descontando lo improductivo. De aquí sale cuántos kilos y cuántas cabezas caben por hectárea -- la carga animal de la finca.',
  unidad: 'ha',
  formatear: formatearHectareas,
}

export const DEFINICIONES_PARAMETRO: DefinicionParametro[] = [
  ...DEFINICIONES_UMBRAL,
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_PESO_OBJETIVO,
  DEFINICION_HECTAREAS,
]
