'use client'

import { useActionState, useState } from 'react'
import type { NovedadVista } from '@/datos/novedades'
import { cerrarSuministroAccion, type EstadoCierre } from './acciones'

const INICIAL: EstadoCierre = { cerrado: false, error: null }

/**
 * "¿Qué está recibiendo este lote ahora mismo?" -- la pregunta del encargo
 * original. Cada fila se puede cerrar aquí mismo, sin ir a buscar la
 * novedad en la historia de abajo.
 */
export function SuministrosVigentes({ suministros, hoy }: { suministros: NovedadVista[]; hoy: string }) {
  if (suministros.length === 0) {
    return <p className="text-sm text-carbon-3">Este lote no tiene ningún suministro vigente.</p>
  }

  return (
    <ul className="divide-y divide-tierra/10 text-sm">
      {suministros.map((suministro) => (
        <FilaSuministro key={suministro.id} suministro={suministro} hoy={hoy} />
      ))}
    </ul>
  )
}

function FilaSuministro({ suministro, hoy }: { suministro: NovedadVista; hoy: string }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, cerrar, cerrando] = useActionState(cerrarSuministroAccion, INICIAL)

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {suministro.descripcion}{' '}
          <span className="text-carbon-3">
            — desde <span className="cifra">{suministro.fecha}</span>
          </span>
        </div>
        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rounded border border-borde px-3 py-1 text-xs text-carbon-2"
          >
            Cerrar
          </button>
        )}
      </div>

      {abierto && (
        <form
          action={cerrar}
          className="mt-3 space-y-2 rounded border border-borde bg-papel p-3 text-sm"
        >
          <input type="hidden" name="id" value={suministro.id} />
          <p className="text-carbon-2">
            Se deja de dar. No se borra el suministro: queda con esta fecha de fin, visible en la
            historia de abajo.
          </p>
          <label className="block">
            Fecha de fin
            <input
              name="fechaFin"
              type="date"
              defaultValue={hoy}
              max={hoy}
              required
              className="ml-2 rounded border border-borde p-2"
            />
          </label>
          {estado.error && <p className="text-alerta">{estado.error}</p>}
          <div className="flex gap-2">
            <button
              disabled={cerrando}
              className="rounded bg-monte px-4 py-2 text-papel disabled:opacity-50"
            >
              {cerrando ? 'Cerrando…' : 'Confirmar cierre'}
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
