import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { listarHistoria, listarSuministrosVigentes } from '@/datos/novedades'
import { listarPotreros } from '@/datos/potreros'
import { SelectorDeLote, TitularModo } from '../TitularModo'
import { HistoriaNovedades } from './HistoriaNovedades'
import { NovedadForm } from './NovedadForm'
import { SuministrosVigentes } from './SuministrosVigentes'

// Se anota o se cierra un suministro en cualquier visita, así que sin esto
// Next la prerenderiza en el build y deja la historia y los vigentes
// congelados.
export const dynamic = 'force-dynamic'

export default async function Novedad({
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
    <>
      <TitularModo
        titulo="¿Qué pasó?"
        bajada="Un hecho puntual, o algo que les están dando y sigue vigente hasta que lo cierres. Texto libre, sin categorías: lo que importa es que quede anotado de verdad."
      />

      <div className="mt-8">
        <NovedadForm
          lotes={lotes}
          potreros={potreros.map((potrero) => ({ id: potrero.id, nombre: potrero.nombre }))}
          hoy={hoy}
          loteInicial={loteId ?? null}
        />
      </div>

      <SelectorDeLote
        lotes={lotes}
        activo={loteId}
        base="/anotar/novedad"
        todos="Todos los lotes"
      />

      {loteId && (
        <>
          <h2 className="rotulo mb-4 mt-13">Qué recibe este lote ahora mismo</h2>
          <SuministrosVigentes suministros={vigentes} hoy={hoy} />
        </>
      )}

      <h2 className="rotulo mb-4 mt-13">Qué ha pasado</h2>
      <HistoriaNovedades novedades={historia} />
    </>
  )
}
