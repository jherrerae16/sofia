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
  searchParams: Promise<{ lote?: string }>
}) {
  const { lote: loteSeleccionado } = await searchParams
  const lotes = await listarLotes()
  const loteId = loteSeleccionado ?? lotes[0]?.id
  const animales = loteId ? await listarAnimalesDeLote(loteId) : []
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

      <nav className="mt-8 mb-6 flex flex-wrap gap-2">
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/anotar/pesos?lote=${lote.id}`}
            className={`rounded border px-3 py-2 text-[13.5px] no-underline ${
              lote.id === loteId
                ? 'border-monte bg-monte font-semibold text-crema'
                : 'border-borde bg-white text-carbon-2'
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
