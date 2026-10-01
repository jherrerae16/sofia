'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { formatearPesos } from '@/ui/formato'
import { registrarGastoAccion, type EstadoGasto } from './acciones'

const INICIAL: EstadoGasto = { anotado: null, fecha: null, datosEnviados: null, error: null }

const CAMPO = 'w-full rounded border border-borde-2 bg-papel p-3 text-[15px]'

/** Pone los puntos de miles mientras se escribe: "2800000" se ve "2.800.000". */
function conPuntos(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  return digitos ? Number(digitos).toLocaleString('es-CO') : ''
}

/**
 * Una línea por gasto: fecha, qué fue, valor. Después de anotar, la fecha
 * se queda y el foco vuelve a "Qué fue", para vaciar la libreta seguido.
 */
export function GastoForm({ hoy }: { hoy: string }) {
  const [estado, enviar, enviando] = useActionState(registrarGastoAccion, INICIAL)
  const [valor, setValor] = useState('')
  const [tocado, setTocado] = useState(false)

  // Mismo mecanismo que `NovedadForm`: React 19 vacía el formulario al
  // enviarlo, así que cada respuesta recrea los campos con lo que toca --
  // lo enviado si se rechazó, o vacío (con la fecha puesta) si se anotó.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setPoblarKey((k) => k + 1)
    setValor(estado.datosEnviados ? conPuntos(estado.datosEnviados.valor) : '')
    setTocado(false)
  }, [estado])

  const fecha = estado.datosEnviados?.fecha ?? estado.fecha ?? hoy
  const error = tocado ? null : estado.error
  const faltaDescripcion = error?.includes('qué fue')
  const faltaValor = error?.includes('valor')

  return (
    <form action={enviar} onChange={() => setTocado(true)}>
      <div className="grid max-w-[980px] grid-cols-2 items-end gap-[14px] md:grid-cols-[170px_minmax(0,1fr)_190px_auto]">
        <label className="block">
          <span className="rotulo mb-2 block">Fecha</span>
          <input key={`f${poblarKey}`} name="fecha" type="date" defaultValue={fecha} max={hoy} required className={CAMPO} />
        </label>
        <label className="order-first col-span-2 block md:order-none md:col-span-1">
          <span className="rotulo mb-2 block">Qué fue</span>
          <input
            key={`d${poblarKey}`}
            // El campo se recrea en cada respuesta (ver `poblarKey`), así que
            // `autoFocus` le devuelve el foco justo después de anotar.
            autoFocus={estado.anotado !== null}
            name="descripcion"
            defaultValue={estado.datosEnviados?.descripcion ?? ''}
            placeholder="Por ejemplo: recibo de luz de septiembre"
            autoComplete="off"
            className={`${CAMPO} ${faltaDescripcion ? 'border-alerta' : ''}`}
          />
        </label>
        <label className="block">
          <span className="rotulo mb-2 block">Valor</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-carbon-3">$</span>
            <input
              name="valor"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={valor}
              onChange={(e) => setValor(conPuntos(e.target.value))}
              className={`${CAMPO} cifra pl-6 text-right ${faltaValor ? 'border-alerta' : ''}`}
            />
          </span>
        </label>
        <button
          disabled={enviando}
          className="col-span-2 rounded bg-monte px-[26px] py-3 text-[15px] font-semibold text-papel disabled:opacity-50 md:col-span-1"
        >
          Anotar
        </button>
      </div>

      <p className="mt-3 min-h-5 text-sm" aria-live="polite">
        {error && <span className="text-alerta">{error}</span>}
        {!error && estado.anotado && !tocado && (
          <span className="text-monte">
            Se anotó: {estado.anotado.descripcion}, {formatearPesos(estado.anotado.valor)}.
          </span>
        )}
      </p>
    </form>
  )
}
