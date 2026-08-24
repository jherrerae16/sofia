import { hoyBogota } from '@/calc/fechas'
import { listarPotreros } from '@/datos/potreros'
import { EncabezadoPagina } from '@/ui/EncabezadoPagina'
import { Marco } from '@/ui/Marco'
import { crearPotreroAccion } from '../finca/acciones'
import { TarjetaPotrero } from '../finca/TarjetaPotrero'

// Los días de ocupación y de descanso se calculan contra la fecha de hoy: sin
// esto Next la prerenderiza en el build y esos días quedan congelados.
export const dynamic = 'force-dynamic'

const CAMPO = 'rounded border border-borde bg-papel px-3 py-2 text-[14px] text-carbon outline-none'

export default async function Potreros() {
  const hoy = hoyBogota()
  const potreros = await listarPotreros(hoy)

  const ocupados = potreros.filter((potrero) => potrero.lotesOcupantes.length > 0)
  const descansando = potreros.filter((potrero) => potrero.lotesOcupantes.length === 0)

  // La bajada se arma con lo que hay. Sin potreros no se escribe "0 potreros,
  // ninguno descansa": se dice qué falta hacer.
  const frases: string[] = []
  if (potreros.length === 0) {
    frases.push('Todavía no hay ningún potrero. Agrega el primero aquí abajo.')
  } else {
    frases.push(
      `${ocupados.length} ${ocupados.length === 1 ? 'ocupado' : 'ocupados'}, ` +
        `${descansando.length} ${descansando.length === 1 ? 'descansando' : 'descansando'}.`,
    )
    const conMasTiempo = [...ocupados].sort(
      (a, b) => (b.diasOcupacion ?? 0) - (a.diasOcupacion ?? 0),
    )[0]
    if (conMasTiempo) {
      frases.push(
        `${conMasTiempo.lotesOcupantes.join(', ')} lleva ${conMasTiempo.diasOcupacion ?? 0} días en ${conMasTiempo.nombre}.`,
      )
    }
    const masDescansado = [...descansando].sort(
      (a, b) => (b.diasDescanso ?? 0) - (a.diasDescanso ?? 0),
    )[0]
    if (masDescansado && masDescansado.diasDescanso !== null) {
      frases.push(`${masDescansado.nombre} lleva ${masDescansado.diasDescanso} días descansando.`)
    }
  }

  return (
    <Marco>
      <EncabezadoPagina titulo="Los potreros" bajada={frases.join(' ')} />

      {potreros.length > 0 && (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-[10px]">
          {potreros.map((potrero) => (
            <TarjetaPotrero key={potrero.id} potrero={potrero} />
          ))}
        </div>
      )}

      <h2 className="rotulo mb-3 mt-9">Agregar un potrero</h2>
      <form action={crearPotreroAccion} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="rotulo">Nombre</span>
          <input name="nombre" required className={CAMPO} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Hectáreas</span>
          <input name="hectareas" inputMode="decimal" required className={`cifra w-24 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Capacidad en kg</span>
          <input name="capacidadKg" type="number" min="0" required className={`cifra w-28 ${CAMPO}`} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Tipo de pasto</span>
          <input name="tipoPasto" className={`w-32 ${CAMPO}`} />
        </label>
        <label className="flex items-center gap-2 py-3 text-[14px]">
          <input name="tieneAgua" type="checkbox" defaultChecked className="accent-monte" />
          Tiene agua
        </label>
        <button className="rounded-full bg-monte px-4 py-2 text-[13px] font-semibold text-papel">
          Agregar el potrero
        </button>
      </form>
    </Marco>
  )
}
