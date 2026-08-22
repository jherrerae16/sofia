'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { guardarParametroAccion, type EstadoFormularioParametro } from './acciones'

const INICIAL: EstadoFormularioParametro = {
  valorEnviado: null,
  vigenteDesdeEnviada: null,
  aviso: null,
  guardado: false,
  error: null,
}

/**
 * Un solo `<form>`, igual que `SalidaForm.tsx`: no hay dos acciones
 * separadas de "revisar" y "confirmar" (como en `MoverLoteForm.tsx` o
 * `TablaPesaje.tsx`) porque aquí no hace falta conservar una snapshot de lo
 * revisado -- cada envío vuelve a leer y a validar el `<form>` desde cero,
 * confirmado o no. Lo único que decide `confirmado` es si, al encontrar el
 * aviso de "esto deja la clave sin vigente hoy", se guarda de una vez o se
 * vuelve a preguntar.
 */
export function FormularioParametro({ clave, unidad, hoy }: { clave: string; unidad: string; hoy: string }) {
  const [estado, enviar, enviando] = useActionState(guardarParametroAccion, INICIAL)

  // El aviso deja de aplicar en cuanto se toca el valor o la fecha: no se
  // puede confirmar "esto deja sin vigente hoy" sobre un cambio distinto del
  // que se avisó. Mismo mecanismo que `vigente` en `MoverLoteForm.tsx`.
  const [avisoVigente, setAvisoVigente] = useState(true)
  // Fuerza a recrear los campos con su `defaultValue` tomado de la última
  // respuesta del servidor: React vacía los no controlados al enviarse.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setAvisoVigente(true)
    setPoblarKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  function marcarEditado() {
    setAvisoVigente(false)
  }

  const pidiendoConfirmacion = avisoVigente && estado.aviso !== null

  return (
    <form action={enviar} className="mt-3 space-y-2 text-sm">
      <input type="hidden" name="clave" value={clave} />
      <input type="hidden" name="confirmado" value={pidiendoConfirmacion ? '1' : '0'} />
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Nuevo valor
          <span className="ml-2 inline-flex items-center gap-1">
            <input
              key={poblarKey}
              name="valor"
              inputMode="decimal"
              required
              defaultValue={estado.valorEnviado ?? ''}
              onChange={marcarEditado}
              className="cifra w-28 rounded border border-tierra/30 p-2"
            />
            <span className="text-xs text-carbon/60">{unidad}</span>
          </span>
        </label>
        <label>
          Vigente desde
          <input
            key={poblarKey}
            name="vigenteDesde"
            type="date"
            required
            defaultValue={estado.vigenteDesdeEnviada ?? hoy}
            onChange={marcarEditado}
            className="ml-2 rounded border border-tierra/30 p-2"
          />
        </label>
        <button
          disabled={enviando}
          className="rounded bg-pasto px-4 py-2 text-white disabled:opacity-50"
        >
          {pidiendoConfirmacion ? 'Guardar de todas formas' : 'Guardar'}
        </button>
      </div>
      {estado.guardado && <p className="text-pasto">Guardado.</p>}
      {estado.aviso && <p className="text-ambar">{estado.aviso}</p>}
      {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}
    </form>
  )
}
