'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DESTINOS = [
  { href: '/', texto: 'Ganado' },
  { href: '/anotar', texto: 'Anotar' },
  { href: '/finca', texto: 'Finca' },
] as const

export function Navegacion() {
  const ruta = usePathname()

  return (
    <nav className="flex gap-[2px] rounded bg-crema-2 p-[3px]">
      {DESTINOS.map((destino) => {
        // '/' solo se marca en '/' exacto. Con `startsWith` también se
        // encendería en cualquier otra ruta, y se verían dos destinos
        // marcados a la vez.
        const activo =
          destino.href === '/'
            ? ruta === '/'
            : ruta === destino.href || ruta.startsWith(`${destino.href}/`)

        return (
          <Link
            key={destino.href}
            href={destino.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-[2px] px-[18px] py-2 text-[13.5px] font-semibold no-underline ${
              activo ? 'bg-monte text-crema' : 'text-carbon-2'
            }`}
          >
            {destino.texto}
          </Link>
        )
      })}
    </nav>
  )
}
