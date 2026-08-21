import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { listarPotreros } from '@/datos/potreros'
import { formatearKg } from '@/ui/formato'
import { moverLoteAccion } from './acciones'

const ETIQUETA_CAPACIDAD = {
  holgado: { texto: 'Holgado', clase: 'text-pasto' },
  ajustado: { texto: 'Ajustado', clase: 'text-ambar' },
  sobrecargado: { texto: 'Sobrecargado', clase: 'text-rojo-tierra font-semibold' },
}

export default async function Potreros() {
  const hoy = hoyBogota()
  const potreros = await listarPotreros(hoy)
  const lotes = await listarLotes()

  return (
    <main className="p-6">
      <h1 className="mb-6 font-serif text-3xl text-pasto">Potreros</h1>
      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Potrero</th>
            <th className="p-2">Hectáreas</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Ocupación</th>
            <th className="p-2">Descanso</th>
            <th className="p-2">Peso vivo</th>
            <th className="p-2">Capacidad</th>
          </tr>
        </thead>
        <tbody>
          {potreros.map((potrero) => (
            <tr key={potrero.id} className="border-b border-tierra/10">
              <td className="p-2">{potrero.nombre}</td>
              <td className="cifra p-2">{potrero.hectareas}</td>
              <td className="p-2">{potrero.loteActual ?? '—'}</td>
              <td className="cifra p-2">
                {potrero.diasOcupacion === null ? '—' : `${potrero.diasOcupacion} días`}
              </td>
              <td className="cifra p-2">
                {potrero.diasDescanso === null ? '—' : `${potrero.diasDescanso} días`}
              </td>
              <td className="cifra p-2">{formatearKg(potrero.pesoVivoKg)}</td>
              <td className={`p-2 ${ETIQUETA_CAPACIDAD[potrero.estadoCapacidad].clase}`}>
                {ETIQUETA_CAPACIDAD[potrero.estadoCapacidad].texto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Mover un lote</h2>
        <form action={moverLoteAccion} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Lote
            <select name="loteId" required className="ml-2 rounded border border-tierra/30 p-2">
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            A potrero
            <select name="potreroDestinoId" required className="ml-2 rounded border border-tierra/30 p-2">
              {potreros.map((potrero) => (
                <option key={potrero.id} value={potrero.id}>
                  {potrero.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input name="fecha" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <button className="rounded bg-pasto px-4 py-2 text-white">Mover</button>
        </form>
      </section>
    </main>
  )
}
