'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import { registrarNovedadAccion, type EstadoNovedad, type TipoNovedadForm } from './acciones'

const INICIAL: EstadoNovedad = { registrada: false, datosEnviados: null, error: null }

type Opcion = { id: string; nombre: string }

/**
 * Un solo formulario para las dos formas de anotar, no dos pestañas ni dos
 * pantallas: un par de radios ("Hecho puntual" / "Suministro en curso")
 * decide qué campos importan, la misma idea que ya usa `SalidaForm` con su
 * `<select>` de estado. El campo de potrero solo tiene sentido para un
 * hecho puntual -- un suministro es del ganado, no del potrero -- y se
 * OCULTA, no solo se deshabilita, cuando se elige "Suministro en curso",
 * para que el formulario se siga leyendo liviano en el caso más común.
 */
export function NovedadForm({
  lotes,
  potreros,
  hoy,
  loteInicial,
}: {
  lotes: Opcion[]
  potreros: Opcion[]
  hoy: string
  /**
   * El lote que ya se está mirando (el filtro de la navegación de abajo, si
   * hay uno). El dueño anota por tandas, casi siempre sobre el mismo lote
   * seguido -- que el `<select>` parta ya en ese lote, en vez de en "— sin
   * lote —", le ahorra reseleccionarlo en cada novedad de la tanda.
   */
  loteInicial: string | null
}) {
  const [estado, enviar, enviando] = useActionState(registrarNovedadAccion, INICIAL)
  const datosEnviados = estado.datosEnviados

  const [tipo, setTipo] = useState<TipoNovedadForm>('hecho')
  const [tocado, setTocado] = useState(false)

  // Mismo mecanismo que `SalidaForm`/`TablaPesaje`: React 19 vacía los
  // campos no controlados de este `<form>` en cuanto se envía. `poblarKey`
  // cambia una vez por respuesta del servidor y fuerza a recrear cada campo
  // con su `defaultValue`/`defaultChecked` tomado de `datosEnviados` -- para
  // que un rechazo (fecha futura, descripción vacía) no borre lo que ya se
  // había escrito, justo cuando el dueño está anotando por tandas y no
  // quiere volver a escribir nada. Tras un envío exitoso, `datosEnviados` es
  // null: los campos vuelven a sus valores por omisión.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setPoblarKey((k) => k + 1)
    setTipo(datosEnviados?.tipo ?? 'hecho')
    setTocado(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  function marcarEditado() {
    setTocado(true)
  }

  return (
    <div className="space-y-3">
      {estado.registrada && !tocado && <p className="text-monte">Se anotó la novedad.</p>}

      <form action={enviar} className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              key={poblarKey}
              type="radio"
              name="tipo"
              value="hecho"
              defaultChecked={(datosEnviados?.tipo ?? 'hecho') === 'hecho'}
              onChange={() => {
                setTipo('hecho')
                marcarEditado()
              }}
            />
            Hecho puntual
          </label>
          <label className="flex items-center gap-1">
            <input
              key={poblarKey}
              type="radio"
              name="tipo"
              value="suministro"
              defaultChecked={datosEnviados?.tipo === 'suministro'}
              onChange={() => {
                setTipo('suministro')
                marcarEditado()
              }}
            />
            Suministro en curso
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            {tipo === 'suministro' ? 'Fecha de inicio' : 'Fecha'}
            <input
              key={poblarKey}
              name="fecha"
              type="date"
              defaultValue={datosEnviados?.fecha ?? hoy}
              max={hoy}
              required
              onChange={marcarEditado}
              className="ml-2 rounded border border-borde p-2"
            />
          </label>
          <label className="text-sm">
            Lote {tipo === 'hecho' && '(opcional)'}
            <select
              key={poblarKey}
              name="loteId"
              required={tipo === 'suministro'}
              defaultValue={datosEnviados?.loteId ?? loteInicial ?? ''}
              onChange={marcarEditado}
              className="ml-2 rounded border border-borde p-2"
            >
              <option value="">— sin lote —</option>
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.nombre}
                </option>
              ))}
            </select>
          </label>
          {tipo === 'hecho' && (
            <label className="text-sm">
              Potrero (opcional)
              <select
                key={poblarKey}
                name="potreroId"
                defaultValue={datosEnviados?.potreroId ?? ''}
                onChange={marcarEditado}
                className="ml-2 rounded border border-borde p-2"
              >
                <option value="">— sin potrero —</option>
                {potreros.map((potrero) => (
                  <option key={potrero.id} value={potrero.id}>
                    {potrero.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="block text-sm">
          {tipo === 'suministro' ? 'Qué se está dando' : 'Qué pasó'}
          <input
            key={poblarKey}
            name="descripcion"
            required
            defaultValue={datosEnviados?.descripcion ?? ''}
            placeholder={
              tipo === 'suministro'
                ? 'Por ejemplo: sal a voluntad en el comedero'
                : 'Por ejemplo: se arregló el bebedero del Jobo'
            }
            onChange={marcarEditado}
            className="mt-1 w-full rounded border border-borde p-2"
          />
        </label>

        {estado.error && <p className="text-barro">{estado.error}</p>}

        <button
          disabled={enviando}
          className="rounded bg-monte px-6 py-3 font-medium text-papel disabled:opacity-50"
        >
          Anotar
        </button>
      </form>
    </div>
  )
}
