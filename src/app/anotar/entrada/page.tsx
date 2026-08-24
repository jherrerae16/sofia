import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { ETIQUETA_TIPO_LOTE } from '@/ui/etiquetas'
import { TitularModo } from '../TitularModo'
import { crearLoteAccion } from './acciones'
import { AltaAnimalesForm } from './AltaAnimalesForm'

// La lista de lotes y sus animales activos cambian con cada alta: sin esto
// Next la prerenderiza en el build y dar de alta un lote o un animal deja la
// tabla vieja hasta la próxima escritura que sí dispare una revalidación.
export const dynamic = 'force-dynamic'

const CAMPO = 'rounded border border-borde bg-papel px-3 py-2 text-[14px] text-carbon outline-none'

export default async function Entrada() {
  const lotes = await listarLotes()
  const hoy = hoyBogota()

  return (
    <>
      <TitularModo
        titulo="¿Qué entró?"
        bajada="Abre el lote y mete la planilla completa de una vez. Los pesos raros se avisan antes de guardar, y o entran todos o no entra ninguno."
      />

      <h2 className="rotulo mb-4 mt-13">Los lotes abiertos</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-borde">
              {['Lote', 'Tipo', 'Abierto', 'Potrero', 'Animales'].map((encabezado) => (
                <th key={encabezado} className="rotulo pb-3 text-left">
                  {encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr key={lote.id} className="border-b border-borde">
                <td className="py-[9px] font-semibold">{lote.nombre}</td>
                <td className="py-[9px]">{ETIQUETA_TIPO_LOTE[lote.tipo]}</td>
                <td className="cifra py-[9px]">{lote.fechaApertura}</td>
                <td className="py-[9px]">{lote.potreroActual ?? '—'}</td>
                <td className="cifra py-[9px]">{lote.animalesActivos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="rotulo mb-4 mt-13">Abrir un lote</h2>
      <form action={crearLoteAccion} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="rotulo">Nombre</span>
          <input name="nombre" required className={CAMPO} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Tipo</span>
          <select name="tipo" defaultValue="ceba" className={CAMPO}>
            <option value="ceba">Ceba</option>
            <option value="leche">Leche</option>
            <option value="otros">Otros</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Fecha</span>
          <input name="fechaApertura" type="date" defaultValue={hoy} required className={CAMPO} />
        </label>
        <button className="rounded bg-monte px-5 py-3 text-[14px] font-semibold text-papel">
          Abrir lote
        </button>
      </form>

      <h2 className="rotulo mb-4 mt-13">Dar de alta animales</h2>
      <p className="mb-4 max-w-[580px] text-[14px] text-carbon-2">
        Una línea por animal, con la chapeta y el peso de entrada separados por un espacio.
      </p>
      <AltaAnimalesForm lotes={lotes} hoy={hoy} />
    </>
  )
}
