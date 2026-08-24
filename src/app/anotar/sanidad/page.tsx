import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { candidatosDeAplicacion, ultimasAplicaciones } from '@/datos/sanidad'
import { SelectorDeLote, TitularModo } from '../TitularModo'
import { SanidadForm } from './SanidadForm'
import { UltimasAplicaciones } from './UltimasAplicaciones'

// Lo que se ve depende de la fecha elegida y de lo que se acabó de anotar.
export const dynamic = 'force-dynamic'

export default async function Sanidad({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string; fecha?: string; animales?: string }>
}) {
  const params = await searchParams
  const hoy = hoyBogota()
  const fecha = params.fecha ?? hoy

  const lotes = await listarLotes()
  const lote = lotes.find((l) => l.id === params.lote) ?? lotes[0]

  if (!lote) {
    return (
      <>
        <TitularModo
          titulo="¿Qué les pusiste?"
          bajada="Todavía no hay ningún lote abierto. Abre uno en «Entrada de ganado» y aquí vas a poder anotarle las vacunas, las desparasitaciones y los tratamientos."
        />
      </>
    )
  }

  const usuario = await usuarioActual()
  const candidatos = await candidatosDeAplicacion(lote.id, fecha)
  const aplicaciones = await ultimasAplicaciones(lote.id, hoy)

  return (
    <>
      <TitularModo
        titulo="¿Qué les pusiste?"
        bajada="Queda guardado novillo por novillo, con el producto y la dosis. Si pones cuándo toca repetirlo, SOFÍA te avisa en «Ganado» cuando se venza."
      />
      <SelectorDeLote lotes={lotes} activo={lote.id} base="/anotar/sanidad" />

      <SanidadForm
        loteId={lote.id}
        loteNombre={lote.nombre}
        fecha={fecha}
        candidatos={candidatos}
        responsablePorDefecto={usuario.nombre}
        // Llegando desde una selección en Ganado, el formulario abre en «solo
        // algunos» con esos ya marcados.
        marcadosIniciales={(params.animales ?? '').split(',').filter(Boolean)}
      />

      <h2 className="rotulo mb-4 mt-13">Lo último que les has puesto</h2>
      <UltimasAplicaciones aplicaciones={aplicaciones} />
    </>
  )
}
