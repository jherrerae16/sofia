'use client'

import { useActionState, useState } from 'react'
import type { GastoVista } from '@/datos/gastos'
import { formatearFechaCorta, formatearPesos } from '@/ui/formato'
import { anularGastoAccion, type EstadoAnulacionGasto } from './acciones'

const INICIAL: EstadoAnulacionGasto = { anulado: false, error: null }

/**
 * Los gastos del mes con su total. Los anulados se quedan, tachados y con
 * su motivo, y no suman: anular no borra nada.
 */
export function ListaGastos({ gastos, total, nombreMes }: { gastos: GastoVista[]; total: number; nombreMes: string }) {
  if (gastos.length === 0) {
    return (
      <p className="mt-4 max-w-[980px] border border-dashed border-borde-2 px-5 py-7 text-[14px] leading-[1.6] text-carbon-2">
        En {nombreMes.toLowerCase()} no hay gastos anotados. Usa el formulario de arriba; cada gasto que anotes
        aparece aquí.
      </p>
    )
  }

  return (
    <div className="mt-4 max-w-[980px] overflow-x-auto">
      <table className="w-full border-collapse text-[14.5px]">
        <thead>
          <tr className="border-b border-borde-2 text-left">
            <th className="rotulo py-[10px] pr-3">Fecha</th>
            <th className="rotulo py-[10px] pr-3">Qué fue</th>
            <th className="rotulo hidden py-[10px] pr-3 md:table-cell">Anotó</th>
            <th className="rotulo py-[10px] pr-3 text-right">Valor</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto) => (
            <FilaGasto key={gasto.id} gasto={gasto} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-borde-2 font-bold">
            <td />
            <td className="py-[14px] pr-3">Total {nombreMes.toLowerCase()}</td>
            <td className="hidden md:table-cell" />
            <td className="cifra whitespace-nowrap py-[14px] pr-3 text-right" data-testid="total-tabla">
              {formatearPesos(total)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function FilaGasto({ gasto }: { gasto: GastoVista }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, anular, anulando] = useActionState(anularGastoAccion, INICIAL)
  const tachado = gasto.anulado ? 'text-carbon-3 line-through' : ''

  return (
    <>
      <tr className={`border-b border-borde align-top ${gasto.anulado ? 'text-carbon-3' : ''}`}>
        <td className="cifra whitespace-nowrap py-[14px] pr-3 text-carbon-2">{formatearFechaCorta(gasto.fecha)}</td>
        <td className="py-[14px] pr-3">
          <span className={tachado}>{gasto.descripcion}</span>
          {gasto.anulado && gasto.motivoAnulacion && (
            <span className="mt-1 block text-[12.5px] text-carbon-3">Anulado: {gasto.motivoAnulacion}</span>
          )}
        </td>
        <td className="hidden whitespace-nowrap py-[14px] pr-3 text-carbon-2 md:table-cell">{gasto.anotadoPor}</td>
        <td className={`cifra whitespace-nowrap py-[14px] pr-3 text-right ${tachado}`}>{formatearPesos(gasto.valor)}</td>
        <td className="py-[14px] text-right">
          {!gasto.anulado && !abierto && (
            <button type="button" onClick={() => setAbierto(true)} className="text-[13px] text-carbon-2 underline">
              Anular
            </button>
          )}
        </td>
      </tr>
      {!gasto.anulado && abierto && (
        <tr className="border-b border-borde">
          <td colSpan={5} className="py-3">
            <form action={anular} className="space-y-2 rounded border border-alerta/30 bg-alerta-suave p-3 text-sm">
              <input type="hidden" name="id" value={gasto.id} />
              <label className="block">
                Por qué se anula (obligatorio)
                <input
                  name="motivo"
                  required
                  placeholder="Por ejemplo: estaba repetido"
                  className="mt-1 w-full rounded border border-borde bg-papel p-2"
                />
              </label>
              {estado.error && <p className="text-alerta">{estado.error}</p>}
              <div className="flex gap-2">
                <button disabled={anulando} className="rounded bg-alerta px-4 py-2 text-papel disabled:opacity-50">
                  {anulando ? 'Anulando…' : 'Confirmar anulación'}
                </button>
                <button type="button" onClick={() => setAbierto(false)} className="rounded px-4 py-2 text-carbon-2">
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  )
}
