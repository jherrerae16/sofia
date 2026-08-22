import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { listarPesajesDeLote } from '@/datos/pesajes'
import { PesajesRecientes } from './PesajesRecientes'
import { TablaPesaje } from './TablaPesaje'

// Igual que en "Cómo vamos": hoy es dinámica solo porque lee `searchParams`.
// Se declara explícito para que no se vuelva estática el día que alguien le
// quite esa lectura y deje la lista de lotes y animales congelada.
export const dynamic = 'force-dynamic'

export default async function Digitar({
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
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Digitar pesaje</h1>
      <p className="mb-6 text-sm text-carbon/70">
        Escribe los pesos de la libreta de arriba abajo. Deja vacías las chapetas que no se pesaron.
      </p>

      <nav className="mb-6 flex gap-2">
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/digitar?lote=${lote.id}`}
            className={`rounded px-3 py-1 text-sm ${
              lote.id === loteId ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {lote.nombre} ({lote.animalesActivos})
          </Link>
        ))}
      </nav>

      <TablaPesaje
        loteId={loteId}
        animales={animales.filter((a) => a.estado === 'activo')}
        hoy={hoyBogota()}
      />

      <PesajesRecientes pesajes={pesajesRecientes} />
    </main>
  )
}
