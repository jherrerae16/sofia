import { hoyBogota } from '@/calc/fechas'
import { mesDe, nombreDelMes } from '@/calc/gastos'
import { listarGastosDelMes, listarTotalesPorMes } from '@/datos/gastos'
import { formatearPesos } from '@/ui/formato'
import { TitularModo } from '../TitularModo'
import { GastoForm } from './GastoForm'
import { ListaGastos } from './ListaGastos'

// Se anota en cualquier visita: sin esto Next congelaría la lista en el build.
export const dynamic = 'force-dynamic'

export default async function Gasto({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: pedido } = await searchParams
  const hoy = hoyBogota()
  // El mes va en la dirección web, igual que el lote en los otros modos:
  // recargar no pierde qué mes se estaba mirando.
  const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : mesDe(hoy)
  const [totales, gastos] = await Promise.all([listarTotalesPorMes(hoy), listarGastosDelMes(mes)])
  const delMes = totales.find((t) => t.mes === mes) ?? { mes, total: 0, gastos: 0 }
  const anulados = gastos.filter((g) => g.anulado).length

  return (
    <>
      <TitularModo
        titulo="¿Qué se gastó?"
        bajada="Un gasto por línea, de la finca entera. Escribe lo que fue con tus palabras y el valor en pesos. Después de anotar, la fecha se queda puesta para seguir con el siguiente."
      />

      <div className="mt-8">
        <GastoForm hoy={hoy} />
      </div>

      <nav className="mt-10 flex flex-wrap gap-2" aria-label="Mes">
        {totales.map((t) => {
          const encendido = t.mes === mes
          return (
            <a
              key={t.mes}
              href={`/anotar/gasto?mes=${t.mes}`}
              aria-current={encendido ? 'page' : undefined}
              className={`flex items-baseline gap-[10px] rounded-full border px-[14px] py-[8px] text-[14px] no-underline ${
                encendido ? 'border-monte bg-monte font-semibold text-papel' : 'border-borde-2 bg-papel text-carbon'
              }`}
            >
              {nombreDelMes(t.mes)}
              <small className={`cifra text-[12px] ${encendido ? 'text-papel/85' : 'text-carbon-3'}`}>
                {formatearPesos(t.total)}
              </small>
            </a>
          )
        })}
      </nav>

      <div className="mt-7 flex flex-wrap items-baseline gap-x-10 gap-y-2">
        <div>
          <div className="rotulo">Total del mes</div>
          <div className="cifra mt-2 text-[34px] font-bold tracking-[-0.01em]" data-testid="total-mes">
            {formatearPesos(delMes.total)}
          </div>
        </div>
        {delMes.gastos > 0 && (
          <p className="text-[14px] text-carbon-2">
            {delMes.gastos} gasto{delMes.gastos === 1 ? '' : 's'}
            {anulados > 0 && ` · ${anulados} anulado${anulados === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <ListaGastos gastos={gastos} total={delMes.total} nombreMes={nombreDelMes(mes)} />

      <p className="mt-12 max-w-[980px] border-t border-borde pt-4 text-[13px] leading-[1.6] text-carbon-3">
        Los gastos anulados no se borran: quedan tachados con el motivo, y no suman al total. En «Bajar todo a
        Excel» salen en la hoja Gastos.
      </p>
    </>
  )
}
