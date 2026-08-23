'use client'

import { useActionState, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CandidatoAplicacion } from '@/datos/sanidad'
import { ETIQUETA_TIPO_EVENTO } from '@/ui/etiquetas'
import { capitalizar } from '@/ui/formato'
import { registrarSanidadAccion, type EstadoSanidad } from './acciones'

// Aquí y no en `acciones.ts`: un archivo 'use server' solo puede exportar
// funciones asíncronas.
const INICIAL: EstadoSanidad = { guardadas: null, datosEnviados: null, error: null }

const CAMPO = 'rounded border border-borde bg-white px-3 py-[10px] text-[14px] text-carbon outline-none min-w-[170px]'

export function SanidadForm({
  loteId,
  loteNombre,
  fecha,
  candidatos,
  responsablePorDefecto,
}: {
  loteId: string
  loteNombre: string
  fecha: string
  candidatos: CandidatoAplicacion[]
  responsablePorDefecto: string
}) {
  const [estado, enviar, enviando] = useActionState(registrarSanidadAccion, INICIAL)
  const router = useRouter()
  const params = useSearchParams()

  const [alcance, setAlcance] = useState<'lote' | 'algunos'>('lote')
  const [marcados, setMarcados] = useState<string[]>([])

  const aplicables = candidatos.filter((candidato) => candidato.aplicable)
  const cuantas = alcance === 'lote' ? aplicables.length : marcados.length

  // Cambiar la fecha vuelve a pedir los candidatos al servidor: quién había
  // entrado en una fecha es una pregunta de la base, no del navegador.
  function cambiarFecha(nueva: string) {
    const siguientes = new URLSearchParams(params.toString())
    siguientes.set('fecha', nueva)
    router.replace(`/anotar/sanidad?${siguientes.toString()}`, { scroll: false })
  }

  const previos = estado.datosEnviados

  return (
    <form action={enviar}>
      <input type="hidden" name="loteId" value={loteId} />
      <input type="hidden" name="alcance" value={alcance} />

      <div className="mt-8 flex flex-wrap items-end gap-[26px]">
        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Qué se aplicó</span>
          <select name="tipo" defaultValue={previos?.tipo ?? 'vacuna'} className={CAMPO}>
            {Object.entries(ETIQUETA_TIPO_EVENTO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {capitalizar(etiqueta)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Producto</span>
          <input
            name="producto"
            placeholder="Nombre del frasco"
            defaultValue={previos?.producto ?? ''}
            className={CAMPO}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Dosis</span>
          <input
            name="dosis"
            placeholder="Opcional"
            defaultValue={previos?.dosis ?? ''}
            className={CAMPO}
          />
          <em className="text-[12px] not-italic text-carbon-3">Por animal</em>
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Fecha</span>
          <input
            name="fecha"
            type="date"
            value={fecha}
            onChange={(evento) => cambiarFecha(evento.target.value)}
            className={CAMPO}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Quién lo aplicó</span>
          <input
            name="responsable"
            defaultValue={previos?.responsable ?? responsablePorDefecto}
            className={CAMPO}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="rotulo">Vuelve a tocar el</span>
          <input
            name="proximaFecha"
            type="date"
            defaultValue={previos?.proximaFecha ?? ''}
            className={CAMPO}
          />
          <em className="text-[12px] not-italic text-carbon-3">Déjalo vacío si no se repite</em>
        </label>
      </div>

      <label className="mt-6 flex max-w-[820px] flex-col gap-[7px]">
        <span className="rotulo">Notas</span>
        <input
          name="notas"
          placeholder="Opcional — para qué fue, qué se vio"
          defaultValue={previos?.notas ?? ''}
          className={`w-full ${CAMPO}`}
        />
      </label>

      <h2 className="rotulo mb-4 mt-13">¿A cuáles?</h2>
      <div className="flex flex-wrap gap-4 text-[14px]">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="alcanceVisible"
            checked={alcance === 'lote'}
            onChange={() => setAlcance('lote')}
            className="accent-monte"
          />
          Todo {loteNombre} · {aplicables.length} animales
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="alcanceVisible"
            checked={alcance === 'algunos'}
            onChange={() => setAlcance('algunos')}
            className="accent-monte"
          />
          Solo algunos
        </label>
      </div>

      {alcance === 'algunos' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {candidatos.map((candidato) => (
            <label
              key={candidato.animalId}
              data-testid={candidato.aplicable ? 'candidato' : 'candidato-fuera'}
              title={candidato.razon ?? undefined}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-[13px] ${
                candidato.aplicable
                  ? 'border-borde bg-white text-carbon'
                  : 'border-borde bg-crema-2 text-carbon-3'
              }`}
            >
              <input
                type="checkbox"
                name="animalIds"
                value={candidato.animalId}
                disabled={!candidato.aplicable}
                checked={marcados.includes(candidato.animalId)}
                onChange={(evento) =>
                  setMarcados((antes) =>
                    evento.target.checked
                      ? [...antes, candidato.animalId]
                      : antes.filter((id) => id !== candidato.animalId),
                  )
                }
                className="accent-monte"
              />
              {candidato.chapeta}
              {candidato.razon && (
                <span className="text-[11px] text-carbon-3">— {candidato.razon}</span>
              )}
            </label>
          ))}
        </div>
      )}

      <p
        data-testid="resumen"
        className="mt-6 max-w-[820px] rounded border border-borde bg-crema-2 px-4 py-3 text-[13.5px] leading-[1.6] text-carbon-2"
      >
        Se guardan{' '}
        <b className="text-carbon">
          {cuantas} {cuantas === 1 ? 'anotación' : 'anotaciones'}
        </b>
        , una por animal, no una del lote. Así el récord de cada uno lo sigue a donde lo muevas y no
        se pierde cuando lo vendas.
      </p>

      {estado.error && (
        <p
          data-testid="error"
          role="alert"
          className="mt-4 rounded border border-barro/40 bg-white px-4 py-3 text-[14px] text-barro"
        >
          {estado.error}
        </p>
      )}
      {estado.guardadas !== null && !estado.error && (
        <p className="mt-4 text-[14px] text-monte">Quedó anotado.</p>
      )}

      <div className="mt-6 flex gap-[10px]">
        <button
          type="submit"
          disabled={enviando || cuantas === 0}
          className="rounded bg-monte px-5 py-3 text-[14px] font-semibold text-crema disabled:opacity-50"
        >
          Guardar {cuantas === 1 ? 'la anotación' : `las ${cuantas}`}
        </button>
      </div>
    </form>
  )
}
