import { hoyBogota } from '@/calc/fechas'
import { obtenerFinca } from '@/datos/finca'
import { CLAVE_HECTAREAS_UTILES, estadoParametro, leerParametro } from '@/datos/parametros'
import { listarPotreros } from '@/datos/potreros'
import { formatearHectareas } from '@/ui/formato'
import { Marco } from '@/ui/Marco'
import { Titular } from '@/ui/Titular'
import { crearPotreroAccion } from './acciones'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_HECTAREAS,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_UMBRAL,
} from './definiciones'
import { FilaCriterio } from './FilaCriterio'
import { TarjetaPotrero } from './TarjetaPotrero'

// Los días de ocupación y de descanso se calculan contra la fecha de hoy: sin
// esto Next la prerenderiza en el build y esos días quedan congelados.
export const dynamic = 'force-dynamic'

const CAMPO = 'rounded border border-borde bg-white px-3 py-2 text-[14px] text-carbon outline-none'

export default async function Finca() {
  const hoy = hoyBogota()
  const finca = await obtenerFinca()
  const potreros = await listarPotreros(hoy)
  const hectareasTexto = await leerParametro(CLAVE_HECTAREAS_UTILES, hoy)
  const hectareas = hectareasTexto === null ? null : Number(hectareasTexto)

  const [umbrales, gdpObjetivo, pesoObjetivo, estadoHectareas] = await Promise.all([
    Promise.all(DEFINICIONES_UMBRAL.map((definicion) => estadoParametro(definicion.clave, hoy))),
    estadoParametro(DEFINICION_GDP_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_PESO_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_HECTAREAS.clave, hoy),
  ])

  const ocupados = potreros.filter((potrero) => potrero.lotesOcupantes.length > 0)
  const descansando = potreros.filter((potrero) => potrero.lotesOcupantes.length === 0)

  // La bajada se arma con lo que hay. Sin potreros no se escribe "0 potreros.
  // Ninguno descansa": se dice qué falta hacer.
  const frases: string[] = []
  if (potreros.length === 0) {
    frases.push('Todavía no hay ningún potrero. Agrega el primero aquí abajo.')
  } else {
    frases.push(potreros.length === 1 ? 'Un potrero.' : `${potreros.length} potreros.`)
    if (ocupados.length > 0) {
      const conMasTiempo = [...ocupados].sort(
        (a, b) => (b.diasOcupacion ?? 0) - (a.diasOcupacion ?? 0),
      )[0]
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
      <Titular>
        <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
          {finca?.nombre ?? 'La finca'}
          {hectareas !== null && Number.isFinite(hectareas)
            ? ` · ${formatearHectareas(hectareas)} hectáreas útiles`
            : ''}
        </h1>
        <p className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">{frases.join(' ')}</p>
      </Titular>

      <h2 className="rotulo mb-4 mt-13">Los potreros</h2>
      {potreros.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(238px,1fr))] gap-[14px]">
          {potreros.map((potrero) => (
            <TarjetaPotrero key={potrero.id} potrero={potrero} />
          ))}
        </div>
      )}

      <form action={crearPotreroAccion} className="mt-4 flex flex-wrap items-end gap-3">
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
          <input
            name="capacidadKg"
            type="number"
            min="0"
            required
            className={`cifra w-28 ${CAMPO}`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="rotulo">Tipo de pasto</span>
          <input name="tipoPasto" className={`w-32 ${CAMPO}`} />
        </label>
        <label className="flex items-center gap-2 py-3 text-[14px]">
          <input name="tieneAgua" type="checkbox" defaultChecked className="accent-monte" />
          Tiene agua
        </label>
        <button className="rounded bg-monte px-5 py-3 text-[14px] font-semibold text-crema">
          Agregar el potrero
        </button>
      </form>

      <h2 className="rotulo mb-4 mt-13">Los criterios de la finca</h2>
      <p className="mb-4 max-w-[640px] text-[13.5px] text-carbon-2">
        Estos números gobiernan lo que ves en las otras pantallas. Cambiarlos no reescribe el
        pasado: cada valor queda con la fecha desde la que rige, y lo que hubo antes no se borra.
        Por debajo del más bajo de los cuatro umbrales, un novillo cae en «crítico»: ese nivel no
        tiene un número propio, es todo lo que queda por debajo.
      </p>
      <div className="border-t border-borde">
        {DEFINICIONES_UMBRAL.map((definicion, i) => (
          <FilaCriterio
            key={definicion.clave}
            definicion={definicion}
            estado={umbrales[i]}
            hoy={hoy}
          />
        ))}
        <FilaCriterio definicion={DEFINICION_GDP_OBJETIVO} estado={gdpObjetivo} hoy={hoy} />
        <FilaCriterio definicion={DEFINICION_PESO_OBJETIVO} estado={pesoObjetivo} hoy={hoy} />
        <FilaCriterio definicion={DEFINICION_HECTAREAS} estado={estadoHectareas} hoy={hoy} />
      </div>

      <h2 className="rotulo mb-4 mt-13">Tu copia de todo</h2>
      <div className="flex flex-wrap items-center gap-[22px] rounded border border-borde bg-crema-2 p-[22px]">
        <p className="min-w-[280px] flex-1 text-[14px] leading-[1.55] text-carbon-2">
          Baja la finca entera a un archivo de Excel: los animales, los pesajes, los lotes, los
          potreros, los movimientos, la sanidad, las novedades y los parámetros, con todo el
          histórico e incluyendo lo anulado y lo que ya salió. No es un informe: son los datos tal
          cual están guardados. <b className="text-carbon">Es tu salida:</b> con ese archivo puedes
          dejar SOFÍA cuando quieras y quedarte con tu información.
        </p>
        <a
          href="/exportar"
          className="rounded bg-monte px-5 py-3 text-[14px] font-semibold text-crema no-underline"
        >
          Bajar todo a Excel
        </a>
      </div>
    </Marco>
  )
}
