'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * El orden es el de frecuencia real, no el alfabético ni el del esquema: se
 * pesa todas las semanas y se vende dos veces al año.
 */
const MODOS = [
  { href: '/anotar/pesos', texto: 'Pesos' },
  { href: '/anotar/salida', texto: 'Venta o muerte' },
  { href: '/anotar/novedad', texto: 'Novedad' },
  { href: '/anotar/mover', texto: 'Mover lote' },
  { href: '/anotar/entrada', texto: 'Entrada de ganado' },
  { href: '/anotar/sanidad', texto: 'Sanidad' },
] as const

export function ModosAnotar() {
  const ruta = usePathname()

  return (
    <div
      data-testid="modos"
      className="mt-10 flex w-fit max-w-full flex-wrap gap-[2px] rounded bg-papel-2 p-[3px]"
    >
      {MODOS.map((modo) => {
        const activo = ruta === modo.href
        return (
          <Link
            key={modo.href}
            href={modo.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-[2px] px-[18px] py-[9px] text-[13.5px] font-semibold no-underline ${
              activo ? 'bg-monte text-papel' : 'text-carbon-3'
            }`}
          >
            {modo.texto}
          </Link>
        )
      })}
    </div>
  )
}
