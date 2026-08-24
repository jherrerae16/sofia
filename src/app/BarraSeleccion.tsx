import Link from 'next/link'

/**
 * La barra que aparece abajo cuando hay animales marcados.
 *
 * Es lo que vuelve fácil actuar: se marcan tres novillos en la lista y se les
 * hace algo desde ahí mismo. Antes había que ir a otra pantalla, volver a
 * escoger el lote y volver a buscarlos uno por uno.
 *
 * «Moverlos de lote» no está: hoy mover es una operación del lote entero
 * contra un potrero, no de animales sueltos entre lotes. Ponerla aquí sería
 * prometer algo que la capa de datos no hace.
 */
const ACCIONES = [
  { href: '/anotar/pesos', texto: 'Anotarles peso' },
  { href: '/anotar/sanidad', texto: 'Aplicarles sanidad' },
  { href: '/anotar/salida', texto: 'Registrar su salida' },
] as const

export function BarraSeleccion({
  loteId,
  marcados,
  alLimpiar,
}: {
  loteId: string
  marcados: string[]
  alLimpiar: () => void
}) {
  if (marcados.length === 0) return null

  const cola = `?lote=${loteId}&animales=${marcados.join(',')}`

  return (
    <div
      data-testid="barra-seleccion"
      className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-[10px] rounded-lg bg-carbon px-4 py-[11px] text-papel"
    >
      <span className="cifra text-[13.5px] font-bold">
        {marcados.length} {marcados.length === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      {ACCIONES.map((accion) => (
        <Link
          key={accion.href}
          href={`${accion.href}${cola}`}
          className="rounded-full border border-papel/30 px-[13px] py-[5px] text-[12.5px] text-papel no-underline"
        >
          {accion.texto}
        </Link>
      ))}
      <button type="button" onClick={alLimpiar} className="ml-auto text-[12.5px] text-papel/70">
        Quitar selección
      </button>
    </div>
  )
}
