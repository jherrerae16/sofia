import type { FechaISO } from './tipos'

/** Un mes como 'YYYY-MM'. */
export type Mes = string

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Lo que cabe en la columna entera de Postgres. Un gasto por encima de
// $2.147 millones es casi seguro un dedazo de ceros de más.
const VALOR_MAXIMO = 2_147_483_647

export function mesDe(fecha: FechaISO): Mes {
  return fecha.slice(0, 7)
}

export function nombreDelMes(mes: Mes): string {
  const [anio, numero] = mes.split('-')
  return `${MESES[Number(numero) - 1]} ${anio}`
}

export type TotalMes = { mes: Mes; total: number; gastos: number }

/**
 * El total de cada mes, del más reciente al más viejo. Los anulados no
 * suman, pero su mes sigue apareciendo para que se pueda ver qué se anuló.
 * El mes de hoy está siempre, aunque esté vacío: es donde se va a anotar.
 */
export function totalesPorMes(
  gastos: { fecha: FechaISO; valor: number; anulado: boolean }[],
  mesActual: Mes,
): TotalMes[] {
  const porMes = new Map<Mes, TotalMes>([[mesActual, { mes: mesActual, total: 0, gastos: 0 }]])
  for (const gasto of gastos) {
    const mes = mesDe(gasto.fecha)
    const acumulado = porMes.get(mes) ?? { mes, total: 0, gastos: 0 }
    if (!gasto.anulado) {
      acumulado.total += gasto.valor
      acumulado.gastos += 1
    }
    porMes.set(mes, acumulado)
  }
  return [...porMes.values()].sort((a, b) => b.mes.localeCompare(a.mes))
}

/**
 * Lee el valor tal como se escribe en la casilla: "2.800.000", "$ 312.400"
 * o "95000". Los puntos son separadores de miles; el peso no tiene
 * centavos, así que una coma decimal se rechaza en vez de adivinarla.
 */
export function leerValorEnPesos(texto: string): number | null {
  const limpio = texto.replace(/[$\s.]/g, '')
  if (!/^\d+$/.test(limpio)) return null
  const valor = Number(limpio)
  return valor > 0 && valor <= VALOR_MAXIMO ? valor : null
}
