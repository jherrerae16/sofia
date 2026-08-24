import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { listarPesajesDeLote } from '@/datos/pesajes'
import { PesajesRecientes } from './PesajesRecientes'
import { TablaPesaje } from './TablaPesaje'

// Dinámica solo porque lee `searchParams`. Se declara explícito para que no
// se vuelva estática el día que alguien le quite esa lectura y deje la lista
// de lotes y animales congelada.
export const dynamic = 'force-dynamic'

export default async function Pesos({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string; animales?: string }>
}) {
  const { lote: loteSeleccionado, animales: marcados } = await searchParams
  const lotes = await listarLotes()
  const loteId = loteSeleccionado ?? lotes[0]?.id
  const todos = loteId ? await listarAnimalesDeLote(loteId) : []

  // Cuando se llega desde una selección en Ganado, la tabla trae solo esos.
  // Sin esto la selección no serviría de nada: habría que volver a buscarlos
  // uno por uno entre los catorce.
  const escogidos = new Set((marcados ?? '').split(',').filter(Boolean))
  const animales = escogidos.size > 0 ? todos.filter((animal) => escogidos.has(animal.id)) : todos
  const pesajesRecientes = loteId ? await listarPesajesDeLote(loteId) : []

  return (
    <>
      <div className="max-w-[820px] pt-8">
        <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
          Pasa la libreta.
        </h1>
        <p className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">
          Escribe de arriba abajo con la tecla Tab. Deja vacías las chapetas que no se pesaron.
        </p>
      </div>

      {escogidos.size > 0 && (
        <p className="mt-6 rounded border border-borde bg-papel-2 px-4 py-3 text-[13.5px] text-carbon-2">
          Estás pesando {escogidos.size} {escogidos.size === 1 ? 'animal' : 'animales'} que
          escogiste en Ganado.{' '}
          <Link href={`/anotar/pesos?lote=${loteId}`} className="text-carbon underline underline-offset-[3px]">
            Pesar todo el lote
          </Link>
        </p>
      )}

      <nav className="mt-6 mb-6 flex flex-wrap gap-2">
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/anotar/pesos?lote=${lote.id}`}
            className={`rounded border px-3 py-2 text-[13.5px] no-underline ${
              lote.id === loteId
                ? 'border-monte bg-monte font-semibold text-papel'
                : 'border-borde bg-papel text-carbon-2'
            }`}
          >
            {lote.nombre} ({lote.animalesActivos})
          </Link>
        ))}
      </nav>

      <TablaPesaje
        loteId={loteId}
        animales={animales.filter((animal) => animal.estado === 'activo')}
        hoy={hoyBogota()}
      />

      <PesajesRecientes pesajes={pesajesRecientes} />
    </>
  )
}
