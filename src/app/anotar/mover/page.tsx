import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { listarPotreros } from '@/datos/potreros'
import { TitularModo } from '../TitularModo'
import { MoverLoteForm } from './MoverLoteForm'

// Los días de ocupación y de descanso se calculan contra la fecha de hoy: sin
// esto Next la prerenderiza en el build y esos días quedan congelados.
export const dynamic = 'force-dynamic'

export default async function Mover() {
  const hoy = hoyBogota()
  const potreros = await listarPotreros(hoy)
  const lotes = await listarLotes()

  return (
    <>
      <TitularModo
        titulo="¿A dónde los pasas?"
        bajada="SOFÍA te avisa si el potrero queda cargado, pero no te lo impide: a veces no hay otro potrero disponible y la decisión es tuya."
      />
      <div className="mt-8">
        <MoverLoteForm lotes={lotes} potreros={potreros} hoy={hoy} />
      </div>
    </>
  )
}
