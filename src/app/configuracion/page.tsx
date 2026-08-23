import { hoyBogota } from '@/calc/fechas'
import { estadoParametro, type EstadoParametro } from '@/datos/parametros'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_HECTAREAS,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_UMBRAL,
  type DefinicionParametro,
} from './definiciones'
import { FormularioParametro } from './FormularioParametro'

// El valor vigente de cada parámetro depende de la fecha de hoy y de lo que
// haya en la base en el momento de abrir la pantalla: sin esto, Next la
// prerenderizaría en el build y un cambio guardado no se vería hasta la
// próxima escritura que sí dispare una revalidación.
export const dynamic = 'force-dynamic'

export default async function Configuracion() {
  const hoy = hoyBogota()
  const [umbrales, gdpObjetivo, pesoObjetivo, hectareas] = await Promise.all([
    Promise.all(DEFINICIONES_UMBRAL.map((definicion) => estadoParametro(definicion.clave, hoy))),
    estadoParametro(DEFINICION_GDP_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_PESO_OBJETIVO.clave, hoy),
    estadoParametro(DEFINICION_HECTAREAS.clave, hoy),
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
          aparece, pero eso solo se ve en &quot;Cómo vamos&quot;: la portada no pinta el semáforo, solo cuenta
          cuántos animales quedan por debajo del umbral &quot;Bajo&quot;, y la ficha de cada animal todavía no
          clasifica nada. Por debajo del más bajo de los cuatro, el animal cae en &quot;Crítico&quot;: ese nivel no
          tiene un número propio, es todo lo que queda por debajo.
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
        <TarjetaParametro definicion={DEFINICION_HECTAREAS} estado={hectareas} hoy={hoy} />
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
