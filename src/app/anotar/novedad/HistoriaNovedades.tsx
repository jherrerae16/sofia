'use client'

import { useActionState, useState } from 'react'
import type { NovedadVista } from '@/datos/novedades'
import { anularNovedadAccion, type EstadoAnulacionNovedad } from './acciones'

const INICIAL: EstadoAnulacionNovedad = { anulada: false, error: null }

/**
 * "¿Qué ha pasado en la finca?" -- hechos y suministros mezclados, más
 * reciente primero. Incluye los anulados con su motivo: anular no borra
 * nada, y "se anuló" tiene que seguir viéndose, no ser indistinguible de
 * "nunca existió" -- mismo principio que `PesajesRecientes`.
 */
export function HistoriaNovedades({ novedades }: { novedades: NovedadVista[] }) {
  if (novedades.length === 0) {
    return <p className="text-sm text-carbon-3">Todavía no hay ninguna novedad registrada.</p>
  }

  return (
    <ul className="divide-y divide-tierra/10 text-sm">
      {novedades.map((novedad) => (
        <FilaNovedad key={novedad.id} novedad={novedad} />
      ))}
    </ul>
  )
}

function FilaNovedad({ novedad }: { novedad: NovedadVista }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, anular, anulando] = useActionState(anularNovedadAccion, INICIAL)

  const referencia = [novedad.loteNombre, novedad.potreroNombre].filter(Boolean).join(' · ')

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="cifra font-medium">{novedad.fecha}</span>
          {novedad.tipo === 'suministro' && (
            <span className="ml-2 text-xs uppercase tracking-wide text-monte">
              {novedad.fechaFin ? (
                <>
                  hasta <span className="cifra">{novedad.fechaFin}</span>
                </>
              ) : (
                'vigente'
              )}
            </span>
          )}
          {' — '}
          {novedad.descripcion}
          {referencia && <span className="text-carbon-3"> ({referencia})</span>}
        </div>

        {novedad.anuladoEn ? (
          <span className="shrink-0 text-xs text-carbon/50">
            Anulada el <span className="cifra">{novedad.anuladoEn}</span>
          </span>
        ) : (
          !abierto && (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="shrink-0 rounded border border-barro px-3 py-1 text-xs text-barro"
            >
              Anular
            </button>
          )
        )}
      </div>

      {novedad.anuladoEn && novedad.motivoAnulacion && (
        <p className="mt-1 text-xs text-carbon-3">Motivo: {novedad.motivoAnulacion}</p>
      )}

      {!novedad.anuladoEn && abierto && (
        <form
          action={anular}
          className="mt-3 space-y-2 rounded border border-barro/30 bg-barro/5 p-3 text-sm"
        >
          <input type="hidden" name="id" value={novedad.id} />
          <label className="block">
            Motivo de la anulación (obligatorio)
            <textarea
              name="motivo"
              required
              rows={2}
              placeholder="Por ejemplo: se digitó en el lote equivocado."
              className="mt-1 w-full rounded border border-borde p-2"
            />
          </label>
          {estado.error && <p className="text-barro">{estado.error}</p>}
          <div className="flex gap-2">
            <button
              disabled={anulando}
              className="rounded bg-barro px-4 py-2 text-crema disabled:opacity-50"
            >
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded px-4 py-2 text-carbon-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
