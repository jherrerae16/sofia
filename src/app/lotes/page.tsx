import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { AltaAnimalesForm } from './AltaAnimalesForm'
import { crearLoteAccion } from './acciones'

// La lista de lotes y sus animales activos cambian con cada alta: sin esto
// Next la prerenderiza en el build (no lee ninguna API dinámica) y dar de
// alta un lote o un animal deja la tabla vieja hasta la próxima escritura
// que sí dispare una revalidación.
export const dynamic = 'force-dynamic'

export default async function Lotes() {
  const lotes = await listarLotes()
  const hoy = hoyBogota()

  return (
    <main className="p-6">
      <h1 className="mb-6 font-serif text-3xl text-pasto">Lotes</h1>

      <table className="mb-8 w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Lote</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Abierto</th>
            <th className="p-2">Potrero</th>
            <th className="p-2">Animales</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => (
            <tr key={lote.id} className="border-b border-tierra/10">
              <td className="p-2 font-medium">{lote.nombre}</td>
              <td className="p-2">{lote.tipo}</td>
              <td className="cifra p-2">{lote.fechaApertura}</td>
              <td className="p-2">{lote.potreroActual ?? '—'}</td>
              <td className="cifra p-2">{lote.animalesActivos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Abrir un lote</h2>
        <form action={crearLoteAccion} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Nombre
            <input name="nombre" required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <label className="text-sm">
            Tipo
            <select name="tipo" defaultValue="ceba" className="ml-2 rounded border border-tierra/30 p-2">
              <option value="ceba">Ceba</option>
              <option value="leche">Leche</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input name="fechaApertura" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <button className="rounded bg-pasto px-4 py-2 text-white">Abrir lote</button>
        </form>
      </section>

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-1 font-serif text-xl text-pasto">Dar de alta animales</h2>
        <p className="mb-3 text-sm text-carbon/70">
          Una línea por animal, con la chapeta y el peso de entrada separados por un espacio.
          O entran todos o no entra ninguno.
        </p>
        <AltaAnimalesForm lotes={lotes} hoy={hoy} />
      </section>
    </main>
  )
}
