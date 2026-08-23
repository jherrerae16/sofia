/** El titular de un modo de Anotar: qué se está anotando y cómo se anota. */
export function TitularModo({ titulo, bajada }: { titulo: string; bajada: string }) {
  return (
    <div className="max-w-[820px] pt-8">
      <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
        {titulo}
      </h1>
      <p className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">{bajada}</p>
    </div>
  )
}

/**
 * La fila de lotes que varios modos usan para elegir sobre cuál anotar.
 * Es un enlace por lote y no un `<select>` a propósito: el lote queda en la
 * dirección web, así que recargar o compartir el enlace no pierde de cuál se
 * estaba hablando.
 */
export function SelectorDeLote({
  lotes,
  activo,
  base,
  todos,
}: {
  lotes: { id: string; nombre: string; animalesActivos: number }[]
  activo: string | undefined
  base: string
  /** Cuando el modo admite "sin filtrar por lote", el enlace que lo representa. */
  todos?: string
}) {
  const clase = (encendido: boolean) =>
    `rounded border px-3 py-2 text-[13.5px] no-underline ${
      encendido
        ? 'border-monte bg-monte font-semibold text-crema'
        : 'border-borde bg-white text-carbon-2'
    }`

  return (
    <nav className="mb-6 mt-8 flex flex-wrap gap-2">
      {todos && (
        <a href={base} className={clase(!activo)}>
          {todos}
        </a>
      )}
      {lotes.map((lote) => (
        <a key={lote.id} href={`${base}?lote=${lote.id}`} className={clase(lote.id === activo)}>
          {lote.nombre} ({lote.animalesActivos})
        </a>
      ))}
    </nav>
  )
}
