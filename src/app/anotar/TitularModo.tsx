import { EncabezadoPagina } from '@/ui/EncabezadoPagina'

/**
 * El titular de un modo de Anotar.
 *
 * Usaba su propia escala (clamp de 27 a 40 px) mientras el resto de las
 * pantallas usaba `EncabezadoPagina` a 25 px: dos titulares de tamaños
 * distintos en la misma plataforma. Ahora es el mismo componente.
 */
export function TitularModo({
  titulo,
  bajada,
  acciones,
}: {
  titulo: string
  bajada: string
  acciones?: React.ReactNode
}) {
  return <EncabezadoPagina titulo={titulo} bajada={bajada} acciones={acciones} />
}

/**
 * La fila de lotes que varios modos usan para elegir sobre cuál anotar.
 *
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
    `rounded-full border px-[13px] py-[7px] text-[13px] no-underline ${
      encendido
        ? 'border-monte bg-monte font-semibold text-papel'
        : 'border-borde bg-papel text-carbon-2'
    }`

  return (
    <nav className="mb-5 mt-6 flex flex-wrap gap-2">
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
