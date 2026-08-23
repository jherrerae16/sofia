export type Celda = {
  rotulo: string
  valor: string
  /** La unidad va aparte y en chico: la cifra es lo que se lee de lejos. */
  unidad?: string
}

export function Cinta({ celdas }: { celdas: Celda[] }) {
  return (
    <div
      data-testid="cinta"
      className="mt-10 flex flex-wrap overflow-hidden rounded border border-borde bg-white"
    >
      {celdas.map((celda) => (
        <div key={celda.rotulo} className="min-w-[160px] flex-1 border-r border-borde px-5 py-4 last:border-r-0">
          <span className="rotulo block">{celda.rotulo}</span>
          <b className="cifra mt-[9px] block text-[25px] font-extrabold leading-none tracking-[-0.02em] text-monte">
            {celda.valor}
            {celda.unidad && (
              <small className="ml-1 text-[14px] font-semibold text-carbon-3">{celda.unidad}</small>
            )}
          </b>
        </div>
      ))}
    </div>
  )
}
