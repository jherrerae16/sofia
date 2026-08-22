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
        <p className="text-pasto">
          {estado.cantidad === 1
            ? 'Se registró la salida de 1 animal.'
            : `Se registró la salida de ${estado.cantidad} animales.`}
        </p>
      )}

      {!loteId || animales.length === 0 ? (
        <p className="text-sm text-carbon/70">
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
                className="ml-2 rounded border border-tierra/30 p-2"
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
                className="ml-2 rounded border border-tierra/30 p-2"
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
                className="ml-2 w-full min-w-64 rounded border border-tierra/30 p-2"
              />
            </label>
          </div>

          <table className="w-full text-sm">
            <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
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
                <tr key={animal.id} className="border-b border-tierra/10">
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
                  <td className="cifra p-2 text-carbon/60">
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
                      className="cifra w-24 rounded border border-tierra/30 p-2 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-carbon/60">
            El peso de venta es el último peso real del animal; no incluye comprador ni precio --
            eso se registra aparte.
          </p>

          {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}

          <button
            disabled={enviando}
            className="rounded bg-pasto px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            Registrar salida
          </button>
        </form>
      )}
    </div>
  )
}
