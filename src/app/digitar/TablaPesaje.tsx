'use client'

import { useActionState } from 'react'
import { guardarAccion, revisarAccion, type EstadoDigitacion } from './acciones'
import { formatearGdp } from '@/ui/formato'

const INICIAL: EstadoDigitacion = { revision: [], guardado: false, error: null }

const COLOR_NIVEL = {
  ok: 'text-pasto',
  advertencia: 'text-ambar',
  rechazo: 'text-rojo-tierra font-semibold',
}

export function TablaPesaje({
  animales,
  hoy,
}: {
  animales: { id: string; chapeta: string }[]
  hoy: string
}) {
  const [estado, revisar, revisando] = useActionState(revisarAccion, INICIAL)
  const [guardadoEstado, guardar, guardando] = useActionState(guardarAccion, INICIAL)

  const porAnimal = new Map(estado.revision.map((r) => [r.animalId, r]))
  const hayRechazos = estado.revision.some((r) => r.nivel === 'rechazo')
  const yaRevisado = estado.revision.length > 0

  return (
    <form action={yaRevisado && !hayRechazos ? guardar : revisar} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Fecha
          <input name="fecha" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
        </label>
        <label className="text-sm">
          Método
          <select name="metodo" defaultValue="cinta" className="ml-2 rounded border border-tierra/30 p-2">
            <option value="cinta">Cinta bovinométrica</option>
            <option value="bascula">Báscula</option>
            <option value="estimacion">Estimación</option>
          </select>
        </label>
        <label className="text-sm">
          Pesó
          <input name="responsable" defaultValue="Joseph" required className="ml-2 rounded border border-tierra/30 p-2" />
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
            const revision = porAnimal.get(animal.id)
            return (
              <tr key={animal.id} className="border-b border-tierra/10">
                <td className="p-2 font-medium">{animal.chapeta}</td>
                <td className="p-2">
                  <input
                    name={`peso_${animal.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    className="cifra w-24 rounded border border-tierra/30 p-2 text-right"
                  />
                </td>
                <td className={`cifra p-2 ${revision ? COLOR_NIVEL[revision.nivel] : ''}`}>
                  {revision ? `${formatearGdp(revision.gdp)} ${revision.mensaje}` : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <label className="block text-sm">
        Notas
        <input name="notas" className="ml-2 w-96 rounded border border-tierra/30 p-2" />
      </label>

      {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}
      {guardadoEstado.error && <p className="text-rojo-tierra">{guardadoEstado.error}</p>}
      {guardadoEstado.guardado && <p className="text-pasto">Pesaje guardado.</p>}
      {hayRechazos && (
        <p className="text-rojo-tierra">
          Corrige las filas en rojo antes de guardar. No se guardará nada mientras haya rechazos.
        </p>
      )}

      <button
        disabled={revisando || guardando}
        className="rounded bg-pasto px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        {yaRevisado && !hayRechazos ? 'Guardar pesaje' : 'Revisar antes de guardar'}
      </button>
    </form>
  )
}
