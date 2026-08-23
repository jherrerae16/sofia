'use client'

import { useActionState, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { guardarAccion, revisarAccion, type EstadoDigitacion } from './acciones'
import { ETIQUETA_METODO_PESAJE } from '@/ui/etiquetas'
import { capitalizar, formatearGdp } from '@/ui/formato'

const INICIAL: EstadoDigitacion = { revision: [], datosRevisados: null, guardado: false, error: null }

const COLOR_NIVEL = {
  ok: 'text-monte',
  advertencia: 'text-barro',
  rechazo: 'text-barro font-semibold',
}

export function TablaPesaje({
  loteId,
  animales,
  hoy,
}: {
  loteId: string | undefined
  animales: { id: string; chapeta: string }[]
  hoy: string
}) {
  // Un guardado exitoso limpia el formulario entero: en vez de ir
  // sincronizando a mano cada input y cada useActionState, se remonta
  // `Formulario` cambiando `version` como key. Es más simple y más difícil
  // de dejar a medias que resetear cada pieza por separado. El aviso de
  // éxito vive aquí arriba, fuera del remonte, para que no desaparezca
  // junto con el formulario que lo generó.
  const [version, setVersion] = useState(0)
  const [avisoGuardado, setAvisoGuardado] = useState(false)

  const alGuardar = useCallback(() => {
    setAvisoGuardado(true)
    setVersion((v) => v + 1)
  }, [])
  const alEditar = useCallback(() => setAvisoGuardado(false), [])

  return (
    <div className="space-y-4">
      {avisoGuardado && <p className="text-monte">Pesaje guardado.</p>}
      {/* El identificador del lote va en la clave, no solo `version`: el
          enlace de arriba es de Next (navegación de cliente, sin recarga
          completa), así que cambiar de lote por sí solo no reiniciaría este
          estado. Sin el lote en la clave, una revisión pedida en el lote
          viejo seguiría vigente al llegar al lote nuevo -- con el botón
          diciendo "Guardar pesaje" y a punto de aplicarle a otro lote una
          revisión que no le corresponde. Esto no es una nota de precaución:
          es lo que hace que ese invariante sea imposible, no solo esperado. */}
      <Formulario
        key={`${loteId ?? 'sin-lote'}-${version}`}
        animales={animales}
        hoy={hoy}
        alGuardar={alGuardar}
        alEditar={alEditar}
      />
    </div>
  )
}

function Formulario({
  animales,
  hoy,
  alGuardar,
  alEditar,
}: {
  animales: { id: string; chapeta: string }[]
  hoy: string
  alGuardar: () => void
  alEditar: () => void
}) {
  const [estado, revisar, revisando] = useActionState(revisarAccion, INICIAL)
  const [guardadoEstado, guardar, guardando] = useActionState(guardarAccion, INICIAL)

  // Una revisión solo sigue siendo válida mientras nadie toque un peso (ni la
  // fecha) después de pedirla: de lo contrario el veredicto en pantalla
  // dejaría de corresponder a lo que se enviaría. Cualquier cambio invalida
  // la revisión vigente y el botón vuelve a pedir "Revisar" antes de guardar.
  // Se usa useLayoutEffect (no useEffect) para que, al llegar una revisión
  // nueva, se marque vigente antes del primer pintado y no haya un parpadeo
  // de la columna de ganancia quedando vacía por un instante.
  const [vigente, setVigente] = useState(true)
  // React vació los campos del `<form>` al enviarse la revisión (ver el
  // comentario grande más abajo), así que cuando `estado` trae una revisión
  // nueva hay que repoblarlos con lo que de verdad se revisó -- no dejarlos
  // en blanco. Los campos siguen sin controlar (nada de `value` +
  // `onChange` por tecla, que es justo lo que la fluidez exigida prohíbe):
  // en vez de eso, `poblarKey` cambia una vez por revisión y se usa como
  // `key` en cada campo, lo que fuerza a React a recrearlo con un
  // `defaultValue` nuevo tomado de `datosRevisados`. Cambia solo cuando
  // `estado` cambia (una revisión de verdad), nunca por tecla ni por
  // `marcarEditado`, así que no le cuesta nada a la fluidez de digitar.
  const [poblarKey, setPoblarKey] = useState(0)
  useLayoutEffect(() => {
    setVigente(true)
    setPoblarKey((k) => k + 1)
  }, [estado])

  useEffect(() => {
    if (guardadoEstado.guardado) alGuardar()
  }, [guardadoEstado, alGuardar])

  function marcarEditado() {
    setVigente(false)
    alEditar()
  }

  const revision = vigente ? estado.revision : []
  const datosRevisados = vigente ? estado.datosRevisados : null
  const porAnimal = new Map(revision.map((r) => [r.animalId, r]))
  const hayRechazos = revision.some((r) => r.nivel === 'rechazo')
  const yaRevisado = revision.length > 0

  // Base para repoblar los campos tras una revisión -- a propósito, NO
  // gateada por `vigente`: el remonte que la usa (vía `poblarKey`) ocurre
  // siempre en el mismo efecto que pone `vigente` en `true`, así que cuando
  // se repuebla, `estado.datosRevisados` y "lo vigente" son la misma cosa.
  const revisados = estado.datosRevisados
  const pesosPorAnimal = new Map(revisados?.mediciones.map((m) => [m.animalId, m.pesoKg]) ?? [])

  // React 19 vacía los campos no controlados de este `<form>` en cuanto se
  // dispara CUALQUIER envío suyo -- incluida la propia revisión, y antes
  // incluso de que vuelva la respuesta del servidor (es el mecanismo
  // pensado para formularios de "agregar y limpiar", no para uno que se
  // reutiliza dos veces). Para cuando el usuario alcanza a leer la revisión
  // y hacer clic en "Guardar pesaje", el DOM ya no tiene ni la fecha ni los
  // pesos que se revisaron. Releer el `<form>` en ese segundo envío es
  // exactamente el bug: se guardaría lo que quedó en el formulario
  // reiniciado, no lo que el usuario digitó y vio en la tabla.
  //
  // La única fuente confiable es `datosRevisados`: el objeto que ya viajó
  // al servidor -- y volvió -- en el momento exacto de la revisión, el
  // mismo que produjo la columna "Ganancia que resultaría" que el usuario
  // está leyendo en pantalla. `confirmarGuardar` ignora el `FormData` de
  // ese segundo envío (que ya no sirve de nada) y guarda ese objeto
  // directamente. Así lo que se guarda es, por construcción, lo mismo que
  // se revisó y lo mismo que está en pantalla: no hay un segundo lugar
  // del que puedan divergir.
  //
  // "Lo mismo que está en pantalla" no era cierto hasta el `poblarKey` de
  // arriba: antes de eso, el vaciado que hace React seguía siendo visible
  // para el usuario -- lo que se iba a guardar (`datosRevisados`) ya era
  // correcto, pero la pantalla que el usuario lee para decidir si guardar
  // mostraba otra cosa (56 campos en blanco). Peor todavía: si el usuario
  // corregía UN campo sobre ese formulario vacío y volvía a revisar, el
  // segundo `FormData` solo traía ese campo -- `datosRevisados` se
  // sobrescribía con una tanda de una sola medición, y esa sí se guardaba
  // completa y "correctamente" según este mismo mecanismo. Repoblar los
  // campos cierra ambos huecos a la vez: la pantalla vuelve a coincidir con
  // `datosRevisados`, y por eso corregir una fila ya no depende de que las
  // otras 55 hayan sobrevivido un vaciado que nunca ocurrió donde el
  // usuario podía verlo.
  async function confirmarGuardar(_formData: FormData) {
    if (!datosRevisados) return
    guardar(datosRevisados)
  }

  return (
    <form action={yaRevisado && !hayRechazos ? confirmarGuardar : revisar} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Fecha
          <input
            key={poblarKey}
            name="fecha"
            type="date"
            defaultValue={revisados?.fecha ?? hoy}
            max={hoy}
            required
            onChange={marcarEditado}
            className="ml-2 rounded border border-tierra/30 p-2"
          />
        </label>
        <label className="text-sm">
          Método
          <select
            key={poblarKey}
            name="metodo"
            defaultValue={revisados?.metodo ?? 'cinta'}
            onChange={marcarEditado}
            className="ml-2 rounded border border-tierra/30 p-2"
          >
            {/* Las opciones salen del mapa central de etiquetas (`ETIQUETA_METODO_PESAJE`),
                no de una lista escrita a mano aquí: si el esquema agrega un cuarto método,
                la prueba de cobertura de `etiquetas.test.ts` lo obliga a aparecer también en
                ese mapa, y este selector lo hereda solo. Las etiquetas centrales van en
                minúscula (para calzar en una frase); `capitalizar` sube solo la primera letra
                para la opción del selector, sin duplicar el texto. */}
            {Object.entries(ETIQUETA_METODO_PESAJE).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {capitalizar(etiqueta)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Pesó
          <input
            key={poblarKey}
            name="responsable"
            defaultValue={revisados?.responsable ?? 'Joseph'}
            required
            onChange={marcarEditado}
            className="ml-2 rounded border border-tierra/30 p-2"
          />
        </label>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Chapeta</th>
            <th className="p-2">Peso (kg)</th>
            <th className="p-2">Ganancia que resultaría</th>
          </tr>
        </thead>
        <tbody>
          {animales.map((animal) => {
            const revisionFila = porAnimal.get(animal.id)
            return (
              <tr key={animal.id} className="border-b border-tierra/10">
                <td className="p-2 font-medium">{animal.chapeta}</td>
                <td className="p-2">
                  <input
                    key={poblarKey}
                    name={`peso_${animal.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={pesosPorAnimal.get(animal.id) ?? ''}
                    onChange={marcarEditado}
                    className="cifra w-24 rounded border border-tierra/30 p-2 text-right"
                  />
                </td>
                <td className={`cifra p-2 ${revisionFila ? COLOR_NIVEL[revisionFila.nivel] : ''}`}>
                  {revisionFila ? `${formatearGdp(revisionFila.gdp)} ${revisionFila.mensaje}` : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <label className="block text-sm">
        Notas
        <input
          key={poblarKey}
          name="notas"
          defaultValue={revisados?.notas ?? ''}
          onChange={marcarEditado}
          className="ml-2 w-96 rounded border border-tierra/30 p-2"
        />
      </label>

      {estado.error && <p className="text-barro">{estado.error}</p>}
      {guardadoEstado.error && <p className="text-barro">{guardadoEstado.error}</p>}
      {hayRechazos && (
        <p className="text-barro">
          Corrige las filas en rojo antes de guardar. No se guardará nada mientras haya rechazos.
        </p>
      )}

      <button
        disabled={revisando || guardando}
        className="rounded bg-monte px-6 py-3 font-medium text-crema disabled:opacity-50"
      >
        {yaRevisado && !hayRechazos ? 'Guardar pesaje' : 'Revisar antes de guardar'}
      </button>
    </form>
  )
}
