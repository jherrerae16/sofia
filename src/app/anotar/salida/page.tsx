import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { ultimoPesoPorAnimal } from '@/datos/pesajes'
import { SelectorDeLote, TitularModo } from '../TitularModo'
import { SalidaForm } from './SalidaForm'
import { SalidasRecientes } from './SalidasRecientes'

// La lista de lotes y sus animales activos cambia con cada salida registrada,
// así que sin esto Next la prerenderiza en el build y una venta deja la
// pantalla vieja hasta la próxima escritura que sí dispare una revalidación.
export const dynamic = 'force-dynamic'

export default async function Salida({
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
    <>
      <TitularModo
        titulo="¿Qué salió?"
        bajada="Venta, muerte o robo. El caso más común es vender el lote completo: marca «Seleccionar todos» en el encabezado de la tabla. El peso de salida es el último peso real del animal."
      />
      <SelectorDeLote lotes={lotes} activo={loteId} base="/anotar/salida" />

      <SalidaForm loteId={loteId} animales={activos} hoy={hoyBogota()} />

      <SalidasRecientes animales={animales} />
    </>
  )
}
