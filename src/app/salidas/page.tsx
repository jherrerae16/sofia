import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { ultimoPesoPorAnimal } from '@/datos/pesajes'
import { SalidaForm } from './SalidaForm'
import { SalidasRecientes } from './SalidasRecientes'

// Igual que en "Digitar": la lista de lotes y sus animales activos cambia con
// cada salida registrada, así que sin esto Next la prerenderiza en el build y
// una venta deja la pantalla vieja hasta la próxima escritura que sí dispare
// una revalidación.
export const dynamic = 'force-dynamic'

export default async function Salidas({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>
}) {
  const { lote: loteSeleccionado } = await searchParams
  const lotes = await listarLotes()
  const loteId = loteSeleccionado ?? lotes[0]?.id
  const animales = loteId ? await listarAnimalesDeLote(loteId) : []
  const ultimos = loteId ? await ultimoPesoPorAnimal() : new Map()

  const activos = animales
    .filter((animal) => animal.estado === 'activo')
    .map((animal) => ({
      id: animal.id,
      chapeta: animal.chapeta,
      pesoUltimoKg: ultimos.get(animal.id)?.pesoKg ?? null,
    }))

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Salidas</h1>
      <p className="mb-6 text-sm text-carbon/70">
        Registra la venta, la muerte o el robo de uno o varios animales. El caso más común es
        vender el lote completo: marca &quot;Seleccionar todos&quot; en el encabezado de la tabla.
      </p>

      <nav className="mb-6 flex gap-2">
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/salidas?lote=${lote.id}`}
            className={`rounded px-3 py-1 text-sm ${
              lote.id === loteId ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {lote.nombre} ({lote.animalesActivos})
          </Link>
        ))}
      </nav>

      <SalidaForm loteId={loteId} animales={activos} hoy={hoyBogota()} />

      <SalidasRecientes animales={animales} />
    </main>
  )
}
