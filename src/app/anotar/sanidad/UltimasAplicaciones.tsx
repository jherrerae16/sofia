'use client'

import { useActionState, useState } from 'react'
import type { AplicacionVista } from '@/datos/sanidad'
import { ETIQUETA_TIPO_EVENTO } from '@/ui/etiquetas'
import { capitalizar } from '@/ui/formato'
import { anularSanidadAccion, type EstadoAnulacionSanidad } from './acciones'

// Aquí y no en `acciones.ts`: un archivo 'use server' solo puede exportar
// funciones asíncronas.
const INICIAL: EstadoAnulacionSanidad = { anulada: false, error: null }

export function UltimasAplicaciones({ aplicaciones }: { aplicaciones: AplicacionVista[] }) {
  if (aplicaciones.length === 0) {
    return (
      <p className="text-[14px] text-carbon-2">
        Todavía no le has anotado nada a este lote. Lo que anotes aquí arriba va a aparecer en esta
        lista y en la ficha de cada animal.
      </p>
    )
  }

  return (
    <div data-testid="ultimas" className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-borde">
            {['Qué', 'Producto', 'A quién', 'Cuándo', 'Vuelve a tocar', ''].map((encabezado, i) => (
              <th key={encabezado || i} className="rotulo pb-3 text-left">
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        {/* Un <tbody> por aplicación, no uno para toda la tabla: la fila del
            dato y la del formulario de anulación tienen que quedar dentro del
            mismo contenedor para poder tratarse como una sola cosa. HTML
            permite varios <tbody> en una tabla justo para esto. */}
        {aplicaciones.map((aplicacion) => (
          <Fila key={aplicacion.claveTanda} aplicacion={aplicacion} />
        ))}
      </table>
    </div>
  )
}

function Fila({ aplicacion }: { aplicacion: AplicacionVista }) {
  const [estado, anular, anulando] = useActionState(anularSanidadAccion, INICIAL)
  const [preguntando, setPreguntando] = useState(false)

  return (
    <tbody data-testid="aplicacion">
      <tr className="border-b border-borde align-top">
        <td className="py-[9px]">
          <b className={aplicacion.vencida ? 'text-barro' : ''}>
            {capitalizar(ETIQUETA_TIPO_EVENTO[aplicacion.tipo])}
          </b>
        </td>
        <td className="py-[9px]">
          {aplicacion.producto}
          {aplicacion.dosis && (
            <div className="text-[12.5px] text-carbon-3">{aplicacion.dosis}</div>
          )}
        </td>
        <td className="py-[9px] text-[13.5px]">{aplicacion.aQuienes}</td>
        <td className="cifra py-[9px] text-[13.5px]">{aplicacion.fecha}</td>
        <td className={`py-[9px] text-[13.5px] ${aplicacion.vencida ? 'text-barro' : 'text-carbon-3'}`}>
          {aplicacion.proximaFecha === null
            ? 'no se repite'
            : aplicacion.vencida
              ? `${aplicacion.proximaFecha} — vencida`
              : aplicacion.proximaFecha}
        </td>
        <td className="py-[9px] text-right">
          {!preguntando && (
            <button
              type="button"
              onClick={() => setPreguntando(true)}
              className="text-[13px] text-carbon-3 underline underline-offset-[3px]"
            >
              Anular
            </button>
          )}
        </td>
      </tr>

      {preguntando && (
        <tr className="border-b border-borde">
          <td colSpan={6} className="pb-4">
            {/* No se borra: la fila sobrevive con su motivo para el respaldo.
                Por eso el motivo es obligatorio -- una anulación sin
                explicación deja un hueco tan malo como el dato que corrigió. */}
            <form action={anular} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="claveTanda" value={aplicacion.claveTanda} />
              {aplicacion.animalIds.map((id) => (
                <input key={id} type="hidden" name="animalIds" value={id} />
              ))}
              <label className="flex flex-1 flex-col gap-[7px]">
                <span className="rotulo">Motivo</span>
                <input
                  name="motivo"
                  placeholder="Por qué esta anotación no cuenta"
                  className="w-full rounded border border-borde bg-white px-3 py-2 text-[14px] outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={anulando}
                className="rounded border border-barro bg-white px-4 py-2 text-[13.5px] font-semibold text-barro disabled:opacity-50"
              >
                Anular la aplicación
              </button>
              <button
                type="button"
                onClick={() => setPreguntando(false)}
                className="px-2 py-2 text-[13px] text-carbon-3"
              >
                Dejarla
              </button>
              {estado.error && (
                <p data-testid="error" role="alert" className="w-full text-[13.5px] text-barro">
                  {estado.error}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
    </tbody>
  )
}
