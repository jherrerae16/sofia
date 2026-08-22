'use client'

import { useActionState, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { EstadoCapacidad } from '@/calc/potrero'
import { moverLoteAccion, revisarMovimientoAccion, type EstadoMovimiento } from './acciones'

const INICIAL: EstadoMovimiento = { aviso: null, datosRevisados: null, movido: false, error: null }

const COLOR_ESTADO: Record<EstadoCapacidad, string> = {
  holgado: 'text-pasto',
  ajustado: 'text-ambar',
  sobrecargado: 'text-rojo-tierra font-semibold',
}

type Opcion = { id: string; nombre: string }

export function MoverLoteForm({
  lotes,
  potreros,
  hoy,
}: {
  lotes: Opcion[]
  potreros: Opcion[]
  hoy: string
}) {
  // Al confirmar, se remonta el formulario entero (con `key={version}`) en vez
  // de ir limpiando cada pieza de estado a mano: el aviso de la revisión
  // anterior ya no aplica a un formulario en blanco, y así no puede sobrevivir
  // por accidente. El aviso de éxito vive aquí arriba, fuera del remonte.
  const [version, setVersion] = useState(0)
  const [avisoMovido, setAvisoMovido] = useState(false)

  const alMover = useCallback(() => {
    setAvisoMovido(true)
    setVersion((v) => v + 1)
  }, [])
  const alEditar = useCallback(() => setAvisoMovido(false), [])

  if (lotes.length === 0 || potreros.length === 0) {
    return (
      <p className="text-sm text-carbon/70">
        {potreros.length === 0
          ? 'Todavía no hay potreros dados de alta. Crea uno arriba antes de mover un lote.'
          : 'Todavía no hay lotes abiertos. Abre uno en la pantalla de lotes antes de mover un lote.'}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {avisoMovido && <p className="text-sm text-pasto">Movimiento registrado.</p>}
      <Formulario
        key={version}
        lotes={lotes}
        potreros={potreros}
        hoy={hoy}
        alMover={alMover}
        alEditar={alEditar}
      />
    </div>
  )
}

function Formulario({
  lotes,
  potreros,
  hoy,
  alMover,
  alEditar,
}: {
  lotes: Opcion[]
  potreros: Opcion[]
  hoy: string
  alMover: () => void
  alEditar: () => void
}) {
  const [estadoRevision, revisar, revisando] = useActionState(revisarMovimientoAccion, INICIAL)
  const [estadoMovimiento, mover, moviendo] = useActionState(moverLoteAccion, INICIAL)

  // El aviso solo sigue siendo válido mientras nadie toque el lote, el
  // destino o la fecha después de pedirlo: cualquier cambio lo invalida y el
  // botón vuelve a pedir "Revisar" antes de mover, para no confirmar sobre un
  // movimiento distinto del que se avisó.
  const [vigente, setVigente] = useState(true)
  // Mismo mecanismo que en `TablaPesaje.tsx` (ver el comentario grande allá
  // y el de `poblarKey`): React vació los campos al enviarse la revisión, así
  // que sin esto la pantalla mostraría el lote y el potrero reseteados a la
  // primera opción de cada lista mientras "Mover lote" mueve en realidad lo
  // que sí se revisó (`datosRevisados`) -- correcto por debajo, pero
  // contradicho por lo que el ganadero está leyendo para decidir si confirma.
  // `poblarKey` cambia una vez por revisión y fuerza a recrear los campos con
  // `defaultValue` tomado de `datosRevisados`; no depende de ninguna tecla.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setVigente(true)
    setPoblarKey((k) => k + 1)
  }, [estadoRevision])

  useEffect(() => {
    if (estadoMovimiento.movido) alMover()
  }, [estadoMovimiento, alMover])

  function marcarEditado() {
    setVigente(false)
    alEditar()
  }

  const aviso = vigente ? estadoRevision.aviso : null
  const datosRevisados = vigente ? estadoRevision.datosRevisados : null
  const yaRevisado = aviso !== null

  // Base para repoblar, igual que `revisados` en `TablaPesaje.tsx`: a
  // propósito NO gateada por `vigente`, porque el remonte que la usa ocurre
  // en el mismo efecto que pone `vigente` en `true`.
  const revisados = estadoRevision.datosRevisados

  // Mismo mecanismo que en `TablaPesaje.tsx` (ver el comentario grande allá):
  // React 19 vacía los campos no controlados de este `<form>` en cuanto se
  // envía la revisión, antes incluso de que vuelva la respuesta del
  // servidor. Para el segundo envío ("Mover lote") el DOM ya no tiene el
  // lote, el potrero ni la fecha que se revisaron. `confirmarMover` ignora
  // el `FormData` de ese envío y usa en su lugar `datosRevisados`, el mismo
  // objeto que produjo el aviso de capacidad que el usuario está leyendo:
  // lo que se mueve es, por construcción, lo mismo que se revisó.
  async function confirmarMover(_formData: FormData) {
    if (!datosRevisados) return
    mover(datosRevisados)
  }

  return (
    <form action={yaRevisado ? confirmarMover : revisar} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Lote
        <select
          key={poblarKey}
          name="loteId"
          required
          defaultValue={revisados?.loteId}
          onChange={marcarEditado}
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
        A potrero
        <select
          key={poblarKey}
          name="potreroDestinoId"
          required
          defaultValue={revisados?.potreroDestinoId}
          onChange={marcarEditado}
          className="ml-2 rounded border border-tierra/30 p-2"
        >
          {potreros.map((potrero) => (
            <option key={potrero.id} value={potrero.id}>
              {potrero.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Fecha
        <input
          key={poblarKey}
          name="fecha"
          type="date"
          defaultValue={revisados?.fecha ?? hoy}
          required
          onChange={marcarEditado}
          className="ml-2 rounded border border-tierra/30 p-2"
        />
      </label>

      {aviso && aviso.mensaje !== '' && (
        <p className={`w-full text-sm ${COLOR_ESTADO[aviso.estadoResultante]}`}>{aviso.mensaje}</p>
      )}
      {estadoRevision.error && (
        <p className="w-full text-sm text-rojo-tierra">{estadoRevision.error}</p>
      )}
      {estadoMovimiento.error && (
        <p className="w-full text-sm text-rojo-tierra">{estadoMovimiento.error}</p>
      )}

      <button
        disabled={revisando || moviendo}
        className="rounded bg-pasto px-4 py-2 text-white disabled:opacity-50"
      >
        {yaRevisado ? 'Mover lote' : 'Revisar movimiento'}
      </button>
    </form>
  )
}
