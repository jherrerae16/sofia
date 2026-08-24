/**
 * El encabezado de cualquier pantalla: qué estás mirando a la izquierda, qué
 * puedes hacer a la derecha.
 *
 * Las acciones viven aquí y no regadas dentro del contenido, que es como
 * estaban antes: había que bajar hasta encontrar el botón.
 */
export function EncabezadoPagina({
  titulo,
  bajada,
  acciones,
}: {
  titulo: React.ReactNode
  bajada?: React.ReactNode
  acciones?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-[60ch]">
        <h1 className="text-[25px] font-semibold leading-[1.2] tracking-[-0.02em] text-monte">
          {titulo}
        </h1>
        {bajada && <div className="mt-[10px] text-[13.5px] leading-[1.55] text-carbon-2">{bajada}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}
