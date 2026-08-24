export type Celda = {
  rotulo: string
  valor: string
  /** La unidad va aparte y en chico: la cifra es lo que se lee de lejos. */
  unidad?: string
}

/**
 * La fila de cifras del lote. Compacta y con línea entre celdas, no cuatro
 * bloques grandes: son datos de contexto, no la respuesta a nada -- lo que se
 * lee primero es el titular de arriba.
 */
export function Cinta({ celdas }: { celdas: Celda[] }) {
  return (
    <div
      data-testid="cinta"
      className="mt-6 flex flex-wrap overflow-hidden rounded border border-borde bg-papel"
    >
      {celdas.map((celda) => (
        <div
          key={celda.rotulo}
          className="min-w-[150px] flex-1 border-r border-borde px-4 py-[11px] last:border-r-0"
        >
          <span className="rotulo block">{celda.rotulo}</span>
          <b className="cifra mt-[6px] block text-[19px] font-extrabold leading-none tracking-[-0.02em]">
            {celda.valor}
            {celda.unidad && (
              <small className="ml-1 text-[12px] font-semibold text-carbon-3">{celda.unidad}</small>
            )}
          </b>
        </div>
      ))}
    </div>
  )
}
