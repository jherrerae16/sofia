import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { listarPesajesDeLote } from '@/datos/pesajes'
import { SelectorDeLote, TitularModo } from '../TitularModo'
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
      <TitularModo
        titulo="Pasa la libreta."
        bajada="Escribe de arriba abajo con la tecla Tab. Deja vacías las chapetas que no se pesaron."
      />

      {escogidos.size > 0 && (
        <p className="mt-6 rounded border border-borde bg-papel-2 px-4 py-3 text-[13.5px] text-carbon-2">
          Estás pesando {escogidos.size} {escogidos.size === 1 ? 'animal' : 'animales'} que
          escogiste en Ganado.{' '}
          <Link href={`/anotar/pesos?lote=${loteId}`} className="text-carbon underline underline-offset-[3px]">
            Pesar todo el lote
          </Link>
        </p>
      )}

      <SelectorDeLote lotes={lotes} activo={loteId} base="/anotar/pesos" />

      <TablaPesaje
        loteId={loteId}
        animales={animales.filter((animal) => animal.estado === 'activo')}
        hoy={hoyBogota()}
      />

      <PesajesRecientes pesajes={pesajesRecientes} />
    </>
  )
}
