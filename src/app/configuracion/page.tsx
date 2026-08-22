import { hoyBogota } from '@/calc/fechas'
import { obtenerFinca } from '@/datos/finca'
import { estadoParametro, type EstadoParametro } from '@/datos/parametros'
import { formatearHectareas } from '@/ui/formato'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_UMBRAL,
  type DefinicionParametro,
} from './definiciones'
import { FormularioHectareas } from './FormularioHectareas'
import { FormularioParametro } from './FormularioParametro'

// El valor vigente de cada parámetro depende de la fecha de hoy y de lo que
// haya en la base en el momento de abrir la pantalla: sin esto, Next la
// prerenderizaría en el build y un cambio guardado no se vería hasta la
// próxima escritura que sí dispare una revalidación.
export const dynamic = 'force-dynamic'

export default async function Configuracion() {
  const hoy = hoyBogota()
  const [umbrales, gdpObjetivo, pesoObjetivo, finca] = await Promise.all([
    Promise.all(DEFINICIONES_UMBRAL.map((definicion) => estadoParametro(definicion.clave, hoy))),
    estadoParametro(DEFINICION_GDP_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_PESO_OBJETIVO.clave, hoy),
    obtenerFinca(),
  ])

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Configuración</h1>
      <p className="mb-6 max-w-2xl text-sm text-carbon/70">
        Estos son los números que gobiernan el resto de la plataforma. Cambiarlos aquí queda registrado con la
        fecha desde la que rige cada valor -- nunca se borra lo que hubo antes, así que siempre se puede ver qué
        estuvo vigente y desde cuándo.
      </p>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-1 font-serif text-xl text-pasto">Semáforo de desempeño</h2>
        <p className="mb-4 max-w-2xl text-sm text-carbon/70">
          La ganancia diaria de cada novillo se compara contra estos cuatro cortes para decidir en qué color
          aparece -- en la portada, en &quot;Cómo vamos&quot; y en la ficha de cada animal. Por debajo del más bajo
          de los cuatro, el animal cae en &quot;Crítico&quot;: ese nivel no tiene un número propio, es todo lo que
          queda por debajo.
        </p>
        <div className="space-y-6 divide-y divide-tierra/10 [&>*+*]:pt-6">
          {DEFINICIONES_UMBRAL.map((definicion, i) => (
            <TarjetaParametro key={definicion.clave} definicion={definicion} estado={umbrales[i]} hoy={hoy} />
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <TarjetaParametro definicion={DEFINICION_GDP_OBJETIVO} estado={gdpObjetivo} hoy={hoy} />
      </section>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <TarjetaParametro definicion={DEFINICION_PESO_OBJETIVO} estado={pesoObjetivo} hoy={hoy} />
      </section>

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-1 font-serif text-xl text-pasto">Hectáreas útiles de la finca</h2>
        <p className="mb-3 max-w-2xl text-sm text-carbon/70">
          Las hectáreas realmente aprovechables para el ganado, descontando lo improductivo. De aquí sale cuántos
          kilos y cuántas cabezas caben por hectárea -- la carga animal de la finca.
        </p>
        {finca === null ? (
          <p className="text-rojo-tierra">
            Todavía no hay ninguna finca configurada en la base de datos. Contacta a soporte antes de continuar.
          </p>
        ) : (
          <>
            <p className="text-sm text-carbon/70">
              Valor actual:{' '}
              <span className="cifra font-medium">{formatearHectareas(finca.hectareasUtiles)} ha</span>
            </p>
            <p className="mt-1 text-xs text-carbon/50">
              A diferencia de los parámetros de arriba, este valor no lleva histórico: cambiarlo lo sobrescribe.
            </p>
            <FormularioHectareas hectareasUtiles={finca.hectareasUtiles} />
          </>
        )}
      </section>
    </main>
  )
}

function TarjetaParametro({
  definicion,
  estado,
  hoy,
}: {
  definicion: DefinicionParametro
  estado: EstadoParametro
  hoy: string
}) {
  const numeroVigente = estado.valorVigente === null ? null : Number(estado.valorVigente)
  const vigenteEsValido = numeroVigente !== null && Number.isFinite(numeroVigente)

  return (
    <div data-parametro={definicion.clave}>
      <h3 className="font-serif text-lg text-pasto">{definicion.titulo}</h3>
      <p className="max-w-2xl text-sm text-carbon/70">{definicion.explicacion}</p>
      <p data-testid="valor-vigente" className="mt-2 text-sm">
        {estado.valorVigente === null ? (
          <span className="text-ambar">Sin configurar todavía.</span>
        ) : vigenteEsValido ? (
          <>
            Vigente desde <span className="cifra">{estado.vigenteDesde}</span>:{' '}
            <span className="cifra font-medium">{definicion.formatear(numeroVigente)}</span>
          </>
        ) : (
          <span className="text-rojo-tierra">
            El valor vigente hoy (&quot;{estado.valorVigente}&quot;) no es un número. Corrígelo abajo.
          </span>
        )}
      </p>

      <FormularioParametro clave={definicion.clave} unidad={definicion.unidad} hoy={hoy} />

      {estado.historial.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-carbon/60">Ver histórico ({estado.historial.length})</summary>
          <table className="mt-2 w-full max-w-sm text-sm">
            <thead className="text-left text-xs uppercase text-carbon/60">
              <tr>
                <th className="p-1">Vigente desde</th>
                <th className="p-1">Valor</th>
              </tr>
            </thead>
            <tbody>
              {estado.historial.map((fila) => {
                const numero = Number(fila.valor)
                const esValido = Number.isFinite(numero)
                return (
                  <tr key={fila.vigenteDesde + fila.valor} className="border-t border-tierra/10">
                    <td className="cifra p-1">{fila.vigenteDesde}</td>
                    <td className={`cifra p-1 ${esValido ? '' : 'text-rojo-tierra'}`}>
                      {esValido ? definicion.formatear(numero) : `"${fila.valor}" (no es un número)`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
