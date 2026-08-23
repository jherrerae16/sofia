'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { crearAnimalesAccion, type EstadoAlta } from './acciones'

const INICIAL: EstadoAlta = {
  creados: null,
  datosEnviados: null,
  conflictos: [],
  error: null,
  advertencias: null,
}

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
        <p className="text-monte">
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
            className="ml-2 rounded border border-borde p-2"
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
            className="ml-2 rounded border border-borde p-2"
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
            className="ml-2 w-32 rounded border border-borde p-2"
          />
        </label>
        <label className="text-sm">
          Cruce
          <input
            key={poblarKey}
            name="cruce"
            defaultValue={datosEnviados?.cruce ?? ''}
            className="ml-2 w-32 rounded border border-borde p-2"
          />
        </label>
        <label className="text-sm">
          Proveedor
          <input
            key={poblarKey}
            name="proveedor"
            defaultValue={datosEnviados?.proveedor ?? ''}
            className="ml-2 w-40 rounded border border-borde p-2"
          />
        </label>
        <label className="text-sm">
          Edad al entrar (meses)
          <input
            key={poblarKey}
            name="edadEntradaMeses"
            type="number"
            defaultValue={datosEnviados?.edadEntradaMeses ?? ''}
            className="cifra ml-2 w-20 rounded border border-borde p-2"
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
            className="ml-2 rounded border border-borde p-2"
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
        className="cifra w-full rounded border border-borde p-3 font-mono"
      />

      {estado.conflictos.length > 0 && (
        <div className="rounded border border-barro/40 bg-barro/5 p-3 text-sm">
          <p className="mb-2 font-medium text-barro">
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
          <p className="mt-2 text-carbon-2">
            No se dio de alta ningún animal. Corrige solo esas líneas en la planilla (o registra
            primero la salida del animal si ya no debería estar activo) y vuelve a intentarlo.
          </p>
        </div>
      )}
      {/* Defecto 2 del seguimiento del plan 1c: `crearAnimales` valida cada
          peso de entrada contra un rango creíble para un novillo de ceba
          (ver `validarPesoEntrada` en `src/calc/validacion.ts`) y advierte,
          sin rechazar, lo improbable. Una sola casilla confirma TODA la
          tanda -- no una por chapeta -- porque la planilla trae hasta 56
          líneas y pedir una confirmación por animal sería tedioso y
          entrenaría al dueño a marcar sin leer. La casilla nunca llega
          marcada de por sí (no se repuebla desde `datosEnviados`, a
          propósito): cada envío exige su propia confirmación explícita, y
          corregir el peso que la disparó -- sin tocar la casilla -- hace que
          esa advertencia ya no aparezca en el siguiente envío. */}
      {estado.advertencias && estado.advertencias.length > 0 && (
        <div className="space-y-2 rounded border border-barro/40 bg-barro/10 p-3 text-sm">
          <p className="font-medium text-barro">
            Revisa estos pesos de entrada antes de seguir -- ningún animal se dio de alta todavía:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-carbon/80">
            {estado.advertencias.map((advertencia) => (
              <li key={advertencia.chapeta}>
                Chapeta <span className="cifra font-medium">{advertencia.chapeta}</span>:{' '}
                {advertencia.mensaje}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-carbon">
            {/* A propósito SIN `required`: esta casilla solo existe en el DOM
                mientras `estado.advertencias` -- la respuesta del envío
                ANTERIOR -- siga vigente en pantalla, y sigue vigente hasta
                que vuelva la respuesta del envío que la reemplaza. Si fuera
                `required`, corregir el peso sospechoso en la planilla y
                reenviar SIN marcarla quedaría bloqueado por la validación
                nativa del navegador contra esta casilla todavía sin marcar
                -- ni siquiera llegaría a pedirle al servidor que reevalúe el
                valor ya corregido. La obligatoriedad real la impone
                `crearAnimales` (`PesoEntradaSospechosoError`): si el peso
                sigue siendo el mismo y esta casilla sigue sin marcar, el
                servidor vuelve a frenar la tanda con la misma advertencia. */}
            <input type="checkbox" name="confirmarPesosSospechosos" className="h-4 w-4" />
            Confirmo que los pesos están bien, aunque alguno sea inusual.
          </label>
        </div>
      )}

      {estado.error && estado.conflictos.length === 0 && (
        <p className="text-barro">{estado.error}</p>
      )}

      <button
        disabled={enviando}
        className="rounded bg-monte px-6 py-3 font-medium text-crema disabled:opacity-50"
      >
        Dar de alta el lote
      </button>
    </form>
  )
}
