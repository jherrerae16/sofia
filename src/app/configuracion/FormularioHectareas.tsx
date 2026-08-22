'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { actualizarHectareasAccion, type EstadoHectareas } from './acciones'

const INICIAL: EstadoHectareas = { valorEnviado: null, guardado: false, error: null }

/**
 * Más simple que `FormularioParametro`: `hectareasUtiles` no lleva vigencia
 * ni histórico (ver el comentario en `src/datos/finca.ts`), así que no hay
 * ningún aviso de "sin vigente hoy" que confirmar -- solo validar el número
 * y guardar.
 */
export function FormularioHectareas({ hectareasUtiles }: { hectareasUtiles: number }) {
  const [estado, enviar, enviando] = useActionState(actualizarHectareasAccion, INICIAL)
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setPoblarKey((k) => k + 1)
  }, [estado])

  return (
    <form action={enviar} className="mt-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Hectáreas útiles
          <span className="ml-2 inline-flex items-center gap-1">
            <input
              key={poblarKey}
              name="hectareasUtiles"
              inputMode="decimal"
              required
              defaultValue={estado.valorEnviado ?? String(hectareasUtiles)}
              className="cifra w-28 rounded border border-tierra/30 p-2"
            />
            <span className="text-xs text-carbon/60">ha</span>
          </span>
        </label>
        <button disabled={enviando} className="rounded bg-pasto px-4 py-2 text-white disabled:opacity-50">
          Guardar
        </button>
      </div>
      {estado.guardado && <p className="text-pasto">Guardado.</p>}
      {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}
    </form>
  )
}
