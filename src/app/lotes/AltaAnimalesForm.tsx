'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { crearAnimalesAccion, type EstadoAlta } from './acciones'

const INICIAL: EstadoAlta = { creados: null, datosEnviados: null, conflictos: [], error: null }

type Opcion = { id: string; nombre: string }

export function AltaAnimalesForm({ lotes, hoy }: { lotes: Opcion[]; hoy: string }) {
  const [estado, enviar, enviando] = useActionState(crearAnimalesAccion, INICIAL)
  const datosEnviados = estado.datosEnviados

  // React 19 vacía los campos no controlados de este `<form>` en cuanto se
  // envía -- ver el comentario grande en `TablaPesaje.tsx` para la
  // explicación completa. Si `crearAnimales` rechaza la tanda (una chapeta
  // que ya está activa en otro animal), este formulario tiene que volver a
  // mostrar exactamente lo que se envió -- la planilla completa incluida --
  // para que el dueño corrija solo las líneas señaladas, no pegue de nuevo
  // las 56 líneas. `poblarKey` cambia una vez por respuesta del servidor y
  // fuerza a React a recrear cada campo con su `defaultValue` tomado de
  // `estado.datosEnviados`. Tras un alta exitosa, `datosEnviados` es null:
  // los campos vuelven a sus valores por omisión.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setPoblarKey((k) => k + 1)
  }, [estado])

  return (
    <form action={enviar} className="space-y-3">
      {estado.creados !== null && (
        <p className="text-pasto">
          {estado.creados === 1
            ? 'Se dio de alta 1 animal.'
            : `Se dieron de alta ${estado.creados} animales.`}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Lote
          <select
            key={poblarKey}
            name="loteId"
            required
            defaultValue={datosEnviados?.loteId}
            className="ml-2 rounded border border-tierra/30 p-2"
          >
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Sexo
          <select
            key={poblarKey}
            name="sexo"
            defaultValue={datosEnviados?.sexo || 'macho'}
            className="ml-2 rounded border border-tierra/30 p-2"
          >
            <option value="macho">Macho</option>
            <option value="hembra">Hembra</option>
          </select>
        </label>
        <label className="text-sm">
          Raza
          <input
            key={poblarKey}
            name="raza"
            defaultValue={datosEnviados?.raza ?? ''}
            className="ml-2 w-32 rounded border border-tierra/30 p-2"
          />
        </label>
        <label className="text-sm">
          Cruce
          <input
            key={poblarKey}
            name="cruce"
            defaultValue={datosEnviados?.cruce ?? ''}
            className="ml-2 w-32 rounded border border-tierra/30 p-2"
          />
        </label>
        <label className="text-sm">
          Proveedor
          <input
            key={poblarKey}
            name="proveedor"
            defaultValue={datosEnviados?.proveedor ?? ''}
            className="ml-2 w-40 rounded border border-tierra/30 p-2"
          />
        </label>
        <label className="text-sm">
          Edad al entrar (meses)
          <input
            key={poblarKey}
            name="edadEntradaMeses"
            type="number"
            defaultValue={datosEnviados?.edadEntradaMeses ?? ''}
            className="cifra ml-2 w-20 rounded border border-tierra/30 p-2"
          />
        </label>
        <label className="text-sm">
          Fecha de entrada
          <input
            key={poblarKey}
            name="fechaEntrada"
            type="date"
            defaultValue={datosEnviados?.fechaEntrada ?? hoy}
            required
            className="ml-2 rounded border border-tierra/30 p-2"
          />
        </label>
      </div>
      <textarea
        key={poblarKey}
        name="planilla"
        required
        rows={10}
        defaultValue={datosEnviados?.planilla ?? ''}
        placeholder={'001 150\n002 158,5\n003 147'}
        className="cifra w-full rounded border border-tierra/30 p-3 font-mono"
      />

      {estado.conflictos.length > 0 && (
        <div className="rounded border border-rojo-tierra/40 bg-rojo-tierra/5 p-3 text-sm">
          <p className="mb-2 font-medium text-rojo-tierra">
            {estado.conflictos.length === 1
              ? 'Esta chapeta ya está activa en otro animal:'
              : `Estas ${estado.conflictos.length} chapetas ya están activas en otros animales:`}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {estado.conflictos.map((c) => (
              <li key={c.chapeta}>
                <span className="cifra font-medium">{c.chapeta}</span> -- lote {c.loteNombre}, entró el{' '}
                <span className="cifra">{c.fechaEntrada}</span>,{' '}
                {c.pesoUltimoKg === null ? (
                  'sin pesaje todavía'
                ) : (
                  <>
                    último peso <span className="cifra">{c.pesoUltimoKg} kg</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-carbon/70">
            No se dio de alta ningún animal. Corrige solo esas líneas en la planilla (o registra
            primero la salida del animal si ya no debería estar activo) y vuelve a intentarlo.
          </p>
        </div>
      )}
      {estado.error && estado.conflictos.length === 0 && (
        <p className="text-rojo-tierra">{estado.error}</p>
      )}

      <button
        disabled={enviando}
        className="rounded bg-pasto px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        Dar de alta el lote
      </button>
    </form>
  )
}
