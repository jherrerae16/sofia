'use client'

import { useActionState, useLayoutEffect, useState } from 'react'
import type { EstadoSalida } from '@/datos/animales'
import { ETIQUETA_ESTADO_ANIMAL } from '@/ui/etiquetas'
import { registrarSalidaAccion, type EstadoRegistroSalida } from './acciones'

const INICIAL: EstadoRegistroSalida = {
  registrado: false,
  cantidad: 0,
  datosEnviados: null,
  error: null,
  advertencias: null,
}

// Solo los tres motivos de salida, tomados del mapa central: 'activo' no es
// un motivo de salida, así que no entra aquí.
const ETIQUETA_ESTADO: Record<EstadoSalida, string> = {
  vendido: ETIQUETA_ESTADO_ANIMAL.vendido,
  muerto: ETIQUETA_ESTADO_ANIMAL.muerto,
  robado: ETIQUETA_ESTADO_ANIMAL.robado,
}

type AnimalFila = { id: string; chapeta: string; pesoUltimoKg: number | null }

/**
 * A propósito, un solo componente -- no el par "contenedor que remonta con
 * `key`" + "formulario" que usan `TablaPesaje.tsx` y `MoverLoteForm.tsx`.
 * Aquí el caso más común es vender el lote COMPLETO: la propia acción, al
 * tener éxito, deja `animales` en cero en el próximo render (la
 * revalidación que dispara `registrarSalidaAccion` trae de vuelta la lista
 * ya sin los que acaban de salir). Con el patrón de dos componentes, el
 * contenedor decide en el mismo commit "ya no hay animales, no muestro el
 * formulario" -- y esa decisión desmonta al hijo ANTES de que su efecto
 * llegue a avisarle al contenedor que hubo éxito, así que el aviso nunca se
 * mostraba. Con un solo componente el aviso se calcula directamente de
 * `estado.registrado` en el render, no de un efecto que depende de que el
 * árbol siga montado.
 */
export function SalidaForm({
  loteId,
  animales,
  hoy,
}: {
  loteId: string | undefined
  animales: AnimalFila[]
  hoy: string
}) {
  const [estado, enviar, enviando] = useActionState(registrarSalidaAccion, INICIAL)
  const datosEnviados = estado.datosEnviados

  // React 19 vacía los campos no controlados de este `<form>` en cuanto se
  // envía -- ver el comentario grande en `TablaPesaje.tsx` para la
  // explicación completa. Si `registrarSalida` rechaza la tanda (una
  // chapeta que ya salió, una fecha fuera de rango), este formulario tiene
  // que volver a mostrar exactamente lo que se envió -- selección incluida --
  // para que el ganadero corrija solo lo que falló, no las 56 casillas de
  // nuevo. `poblarKey` cambia una vez por respuesta del servidor y fuerza a
  // React a recrear cada campo con su `defaultValue`/`defaultChecked` tomado
  // de `estado.datosEnviados`. Tras un éxito, `datosEnviados` es null: los
  // campos vuelven a sus valores por omisión, sin necesidad de un remonte
  // aparte.
  const [poblarKey, setPoblarKey] = useState(0)
  // El motivo es obligatorio para muerte y robo, opcional para venta -- y
  // esa regla tiene que sentirse mientras se digita, no solo al fallar el
  // envío. Se rastrea aparte del `<select>` (que sigue sin controlar) solo
  // para decidir si el campo de motivo es `required`.
  const [estadoElegido, setEstadoElegido] = useState<EstadoSalida>('vendido')
  // Un envío exitoso deja el aviso "Se registró..." visible; volver a tocar
  // cualquier campo lo esconde, para que no quede pegado junto a una
  // selección nueva que todavía no se ha enviado.
  const [tocado, setTocado] = useState(false)

  useLayoutEffect(() => {
    setPoblarKey((k) => k + 1)
    setEstadoElegido(datosEnviados?.estado ?? 'vendido')
    setTocado(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  const seleccionados = new Set(datosEnviados?.animalIds ?? [])
  const pesosTexto = datosEnviados?.pesos ?? {}
  const motivoObligatorio = estadoElegido !== 'vendido'

  function marcarEditado() {
    setTocado(true)
  }

  function marcarSeleccionTodos(evento: React.ChangeEvent<HTMLInputElement>) {
    const form = evento.currentTarget.form
    if (!form) return
    const marcado = evento.currentTarget.checked
    form.querySelectorAll<HTMLInputElement>('input[name^="sel_"]').forEach((casilla) => {
      casilla.checked = marcado
    })
    marcarEditado()
  }

  return (
    <div className="space-y-4">
      {estado.registrado && !tocado && (
        <p className="text-monte">
          {estado.cantidad === 1
            ? 'Se registró la salida de 1 animal.'
            : `Se registró la salida de ${estado.cantidad} animales.`}
        </p>
      )}

      {!loteId || animales.length === 0 ? (
        <p className="text-sm text-carbon-2">
          No hay animales activos en este lote para registrar una salida.
        </p>
      ) : (
        <form action={enviar} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Motivo de la salida
              <select
                key={poblarKey}
                name="estado"
                defaultValue={datosEnviados?.estado ?? 'vendido'}
                onChange={(e) => {
                  setEstadoElegido(e.target.value as EstadoSalida)
                  marcarEditado()
                }}
                className="ml-2 rounded border border-borde p-2"
              >
                {(Object.entries(ETIQUETA_ESTADO) as [EstadoSalida, string][]).map(
                  ([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm">
              Fecha de salida
              <input
                key={poblarKey}
                name="fechaSalida"
                type="date"
                defaultValue={datosEnviados?.fechaSalida ?? hoy}
                max={hoy}
                required
                onChange={marcarEditado}
                className="ml-2 rounded border border-borde p-2"
              />
            </label>
            <label className="grow text-sm">
              {motivoObligatorio ? 'Motivo (obligatorio)' : 'Nota (opcional)'}
              <input
                key={poblarKey}
                name="motivoSalida"
                defaultValue={datosEnviados?.motivoSalida ?? ''}
                required={motivoObligatorio}
                placeholder={
                  motivoObligatorio
                    ? 'Explica qué pasó: enfermedad, accidente, dónde y cuándo se dio cuenta...'
                    : 'Feria, comprador, lo que sea útil recordar'
                }
                onChange={marcarEditado}
                className="ml-2 w-full min-w-64 rounded border border-borde p-2"
              />
            </label>
          </div>

          <table className="w-full text-sm">
            <thead className="border-b border-borde text-left text-xs uppercase text-carbon-3">
              <tr>
                <th className="p-2">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    onChange={marcarSeleccionTodos}
                    className="h-4 w-4"
                  />
                </th>
                <th className="p-2">Chapeta</th>
                <th className="p-2">Último peso</th>
                <th className="p-2">Peso de venta (kg)</th>
              </tr>
            </thead>
            <tbody>
              {animales.map((animal) => (
                <tr key={animal.id} className="border-b border-borde">
                  <td className="p-2">
                    <input
                      key={poblarKey}
                      type="checkbox"
                      name={`sel_${animal.id}`}
                      defaultChecked={seleccionados.has(animal.id)}
                      onChange={marcarEditado}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-2 font-medium">{animal.chapeta}</td>
                  <td className="cifra p-2 text-carbon-3">
                    {animal.pesoUltimoKg === null ? '—' : animal.pesoUltimoKg}
                  </td>
                  <td className="p-2">
                    <input
                      key={poblarKey}
                      name={`peso_${animal.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="opcional"
                      defaultValue={pesosTexto[animal.id] ?? animal.pesoUltimoKg ?? ''}
                      onChange={marcarEditado}
                      className="cifra w-24 rounded border border-borde p-2 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-carbon-3">
            El peso de venta es el último peso real del animal; no incluye comprador ni precio --
            eso se registra aparte.
          </p>

          {estado.advertencias && estado.advertencias.length > 0 && (
            <div className="space-y-2 rounded border border-alerta/40 bg-alerta/10 p-3 text-sm">
              <p className="font-medium text-alerta">
                Revisa estos pesos de venta antes de seguir -- ninguno se guardó todavía:
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
                {/* A propósito SIN `required` ni `defaultChecked`: esta
                    casilla solo existe en el DOM mientras `estado.advertencias`
                    -- la respuesta del envío ANTERIOR -- siga vigente en
                    pantalla. Si fuera `required`, corregir el peso sospechoso
                    en la tabla y reenviar SIN marcarla quedaría bloqueado por
                    la validación nativa del navegador contra esta misma
                    casilla, todavía sin marcar, del envío anterior -- la
                    petición ni siquiera llegaría al servidor a reevaluar el
                    valor ya corregido. Y si arrastrara `defaultChecked` desde
                    `datosEnviados`, quedaría premarcada por una confirmación
                    que fue sobre una cifra distinta a la que ahora se está
                    reenviando -- eso entrena a marcar sin leer. La
                    obligatoriedad real la impone `registrarSalida`
                    (`PesoSalidaSospechosoError`): si el peso sigue siendo el
                    mismo y esta casilla sigue sin marcar, el servidor vuelve
                    a frenar la salida con la misma advertencia. */}
                <input
                  type="checkbox"
                  name="confirmarPesosSospechosos"
                  onChange={marcarEditado}
                  className="h-4 w-4"
                />
                Confirmo que el peso está bien, aunque sea inusual.
              </label>
            </div>
          )}

          {estado.error && <p className="text-alerta">{estado.error}</p>}

          <button
            disabled={enviando}
            className="rounded bg-monte px-6 py-3 font-medium text-papel disabled:opacity-50"
          >
            Registrar salida
          </button>
        </form>
      )}
    </div>
  )
}
