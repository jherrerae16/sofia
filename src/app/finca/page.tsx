import { hoyBogota } from '@/calc/fechas'
import { obtenerFinca } from '@/datos/finca'
import { CLAVE_HECTAREAS_UTILES, estadoParametro, leerParametro } from '@/datos/parametros'
import { EncabezadoPagina } from '@/ui/EncabezadoPagina'
import { formatearHectareas } from '@/ui/formato'
import { Marco } from '@/ui/Marco'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_HECTAREAS,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_UMBRAL,
} from './definiciones'
import { FilaCriterio } from './FilaCriterio'

// El valor vigente de cada criterio depende de la fecha de hoy y de lo que
// haya en la base al abrir la pantalla: sin esto Next la prerenderiza en el
// build y un cambio guardado no se ve hasta la próxima escritura.
export const dynamic = 'force-dynamic'

export default async function Finca() {
  const hoy = hoyBogota()
  const finca = await obtenerFinca()
  const hectareasTexto = await leerParametro(CLAVE_HECTAREAS_UTILES, hoy)
  const hectareas = hectareasTexto === null ? null : Number(hectareasTexto)

  const [umbrales, gdpObjetivo, pesoObjetivo, estadoHectareas] = await Promise.all([
    Promise.all(DEFINICIONES_UMBRAL.map((definicion) => estadoParametro(definicion.clave, hoy))),
    estadoParametro(DEFINICION_GDP_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_PESO_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_HECTAREAS.clave, hoy),
  ])

  return (
    <Marco>
      <EncabezadoPagina
        titulo={
          <>
            {finca?.nombre ?? 'La finca'}
            {hectareas !== null && Number.isFinite(hectareas)
              ? ` · ${formatearHectareas(hectareas)} hectáreas útiles`
              : ''}
          </>
        }
        bajada="Estos números gobiernan lo que ves en las otras pantallas. Cambiarlos no reescribe el pasado: cada valor queda con la fecha desde la que rige, y lo que hubo antes no se borra. Por debajo del más bajo de los cuatro umbrales, un novillo cae en «crítico»: ese nivel no tiene un número propio, es todo lo que queda por debajo."
      />

      <h2 className="rotulo mb-3 mt-8">Los criterios de la finca</h2>
      <div className="rounded border border-borde bg-papel px-4">
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

      <h2 className="rotulo mb-3 mt-9">Tu copia de todo</h2>
      <div className="flex flex-wrap items-center gap-5 rounded border border-borde bg-papel-2 p-5">
        <p className="min-w-[280px] flex-1 text-[13.5px] leading-[1.55] text-carbon-2">
          Baja la finca entera a un archivo de Excel: los animales, los pesajes, los lotes, los
          potreros, los movimientos, la sanidad, las novedades y los parámetros, con todo el
          histórico e incluyendo lo anulado y lo que ya salió. No es un informe: son los datos tal
          cual están guardados. <b className="text-carbon">Es tu salida:</b> con ese archivo puedes
          dejar SOFIA cuando quieras y quedarte con tu información.
        </p>
        <a
          href="/exportar"
          className="rounded-full bg-monte px-4 py-2 text-[13px] font-semibold text-papel no-underline"
        >
          Bajar todo a Excel
        </a>
      </div>
    </Marco>
  )
}
