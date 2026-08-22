'use client'

import { useActionState, useState } from 'react'
import type { ResumenPesaje } from '@/datos/pesajes'
import { anularAccion, type EstadoAnulacion } from './acciones'

const INICIAL: EstadoAnulacion = { anulado: false, error: null }

const NOMBRE_METODO: Record<string, string> = {
  cinta: 'cinta bovinométrica',
  bascula: 'báscula',
  estimacion: 'estimación',
}

/**
 * Vive en la misma pantalla donde se digita, porque es donde el dedazo se
 * nota: el ganadero acaba de escribir hasta 56 pesos seguidos y quiere poder
 * corregir sin salir de aquí ni buscar un identificador de pesaje en otro
 * lado. Lista las últimas sesiones que tocaron el lote que está viendo,
 * anuladas o no -- una anulada tiene que seguir viéndose, con su motivo,
 * para que "se anuló" no sea indistinguible de "nunca existió".
 */
export function PesajesRecientes({ pesajes }: { pesajes: ResumenPesaje[] }) {
  if (pesajes.length === 0) return null

  return (
    <section className="mt-8 rounded-lg border border-tierra/20 bg-white p-4">
      <h2 className="mb-1 font-serif text-xl text-pasto">Pesajes recientes de este lote</h2>
      <p className="mb-3 text-sm text-carbon/70">
        Si una sesión quedó mal digitada, anúlala aquí. Anular no borra nada: las mediciones
        quedan guardadas, pero dejan de contar en el historial, el último peso y todo lo que se
        calcula a partir de ellos.
      </p>
      <ul className="divide-y divide-tierra/10">
        {pesajes.map((pesaje) => (
          <FilaPesaje key={pesaje.id} pesaje={pesaje} />
        ))}
      </ul>
    </section>
  )
}

function FilaPesaje({ pesaje }: { pesaje: ResumenPesaje }) {
  const [abierto, setAbierto] = useState(false)
  const [estado, anular, anulando] = useActionState(anularAccion, INICIAL)

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="cifra font-medium">{pesaje.fecha}</span>
          {' · '}
          {NOMBRE_METODO[pesaje.metodo] ?? pesaje.metodo}
          {' · '}
          <span className="cifra">{pesaje.cantidadAnimales}</span> animal(es)
          {' · registró '}
          {pesaje.responsable}
        </div>

        {pesaje.anuladoEn ? (
          <span className="text-xs text-carbon/50">
            Anulado el <span className="cifra">{pesaje.anuladoEn}</span>
          </span>
        ) : (
          !abierto && (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="rounded border border-rojo-tierra px-3 py-1 text-xs text-rojo-tierra"
            >
              Anular esta sesión
            </button>
          )
        )}
      </div>

      {pesaje.anuladoEn && pesaje.motivoAnulacion && (
        <p className="mt-1 text-xs text-carbon/60">Motivo: {pesaje.motivoAnulacion}</p>
      )}

      {!pesaje.anuladoEn && abierto && (
        <form
          action={anular}
          className="mt-3 space-y-2 rounded border border-rojo-tierra/30 bg-rojo-tierra/5 p-3"
        >
          <input type="hidden" name="pesajeId" value={pesaje.id} />
          <p className="text-carbon/70">
            Esto <strong>no borra</strong> las mediciones de esta sesión: se conservan en la
            base, pero desde ahora quedan fuera del historial de cada animal, del último peso
            registrado y de todos los cálculos de la finca.
          </p>
          <label className="block">
            Motivo de la anulación (obligatorio)
            <textarea
              name="motivo"
              required
              rows={2}
              placeholder="Por ejemplo: se digitó 174 en vez de 147, dedazo detectado tarde."
              className="mt-1 w-full rounded border border-tierra/30 p-2"
            />
          </label>
          {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}
          <div className="flex gap-2">
            <button
              disabled={anulando}
              className="rounded bg-rojo-tierra px-4 py-2 text-white disabled:opacity-50"
            >
              {anulando ? 'Anulando…' : 'Confirmar anulación'}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded px-4 py-2 text-carbon/70"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
