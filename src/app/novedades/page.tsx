import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { listarHistoria, listarSuministrosVigentes } from '@/datos/novedades'
import { listarPotreros } from '@/datos/potreros'
import { HistoriaNovedades } from './HistoriaNovedades'
import { NovedadForm } from './NovedadForm'
import { SuministrosVigentes } from './SuministrosVigentes'

// Igual que en las demás pantallas operativas: se anota o se cierra un
// suministro en cualquier visita, así que sin esto Next la prerenderiza en
// el build y deja la historia y los vigentes congelados.
export const dynamic = 'force-dynamic'

export default async function Novedades({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>
}) {
  const { lote: loteId } = await searchParams
  const hoy = hoyBogota()
  const lotes = await listarLotes()
  const potreros = await listarPotreros(hoy)
  const vigentes = loteId ? await listarSuministrosVigentes(loteId) : []
  const historia = await listarHistoria(loteId ? { loteId } : {})

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Novedades</h1>
      <p className="mb-6 text-sm text-carbon/70">
        Anota lo que pasa en el campo: un hecho puntual, o un suministro que empieza y sigue en
        curso. Texto libre, sin categorías -- lo que importa es que quede anotado de verdad.
      </p>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Anotar</h2>
        <NovedadForm
          lotes={lotes}
          potreros={potreros.map((potrero) => ({ id: potrero.id, nombre: potrero.nombre }))}
          hoy={hoy}
          loteInicial={loteId ?? null}
        />
      </section>

      <nav className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/novedades"
          className={`rounded px-3 py-1 text-sm ${
            !loteId ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
          }`}
        >
          Todos los lotes
        </Link>
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/novedades?lote=${lote.id}`}
            className={`rounded px-3 py-1 text-sm ${
              lote.id === loteId ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {lote.nombre}
          </Link>
        ))}
      </nav>

      {loteId && (
        <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
          <h2 className="mb-3 font-serif text-xl text-pasto">Qué recibe este lote ahora mismo</h2>
          <SuministrosVigentes suministros={vigentes} hoy={hoy} />
        </section>
      )}

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Qué ha pasado</h2>
        <HistoriaNovedades novedades={historia} />
      </section>
    </main>
  )
}
