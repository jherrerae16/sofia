import type { EstadoParametro } from '@/datos/parametros'
import type { DefinicionParametro } from './definiciones'
import { FormularioParametro } from './FormularioParametro'

/**
 * Un criterio de la finca: qué gobierna, cuánto vale hoy, cómo cambiarlo y qué
 * ha valido antes.
 *
 * El formulario queda a la vista y no detrás de un botón "Cambiar" como en el
 * mockup: esconderlo ahorra una fila de alto y cuesta un clic cada vez, y
 * estos siete campos son justo los que se tocan de a uno y con cuidado.
 */
export function FilaCriterio({
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
    <div
      data-parametro={definicion.clave}
      data-testid="criterio"
      className="border-b border-borde py-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="max-w-[520px]">
          <div className="text-[14.5px] text-carbon">{definicion.titulo}</div>
          <div className="mt-[3px] text-[12.5px] text-carbon-3">{definicion.explicacion}</div>
        </div>

        <div data-testid="valor-vigente" className="text-right text-[13px]">
          {estado.valorVigente === null ? (
            <span className="text-alerta">Sin configurar todavía.</span>
          ) : vigenteEsValido ? (
            <>
              <div className="cifra text-[19px] font-extrabold text-carbon">
                {definicion.formatear(numeroVigente)}
              </div>
              <div className="text-[12px] text-carbon-3">
                Vigente desde <span className="cifra">{estado.vigenteDesde}</span>
              </div>
            </>
          ) : (
            <span className="text-alerta">
              El valor vigente hoy (&quot;{estado.valorVigente}&quot;) no es un número. Corrígelo
              aquí abajo.
            </span>
          )}
        </div>
      </div>

      <FormularioParametro clave={definicion.clave} unidad={definicion.unidad} hoy={hoy} />

      {estado.historial.length > 0 && (
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-carbon-3">
            Ver histórico ({estado.historial.length})
          </summary>
          <table className="mt-2 w-full max-w-sm border-collapse">
            <thead>
              <tr className="border-b border-borde">
                <th className="rotulo pb-2 text-left">Vigente desde</th>
                <th className="rotulo pb-2 text-left">Valor</th>
              </tr>
            </thead>
            <tbody>
              {estado.historial.map((fila) => {
                const numero = Number(fila.valor)
                const esValido = Number.isFinite(numero)
                return (
                  <tr key={fila.vigenteDesde + fila.valor} className="border-b border-borde">
                    <td className="cifra py-[6px]">{fila.vigenteDesde}</td>
                    <td className={`cifra py-[6px] ${esValido ? '' : 'text-alerta'}`}>
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
