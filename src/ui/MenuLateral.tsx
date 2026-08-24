'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Los diez destinos, planos: cada acción del día a día es un renglón, no un
 * modo que hay que escoger después de entrar a otra pantalla. Pesar, aplicar
 * una vacuna o registrar una venta son cosas que se hacen a diario; costaban
 * dos pasos y ahora cuestan uno.
 */
const GRUPOS = [
  {
    titulo: 'El ganado',
    items: [
      { href: '/', texto: 'Ganado', icono: 'chapeta' },
      { href: '/potreros', texto: 'Potreros', icono: 'potrero' },
    ],
  },
  {
    titulo: 'Anotar',
    items: [
      { href: '/anotar/pesos', texto: 'Pesos', icono: 'bascula' },
      { href: '/anotar/sanidad', texto: 'Sanidad', icono: 'jeringa' },
      { href: '/anotar/salida', texto: 'Venta o muerte', icono: 'salida' },
      { href: '/anotar/novedad', texto: 'Novedad', icono: 'nota' },
      { href: '/anotar/mover', texto: 'Mover lote', icono: 'mover' },
      { href: '/anotar/entrada', texto: 'Entrada de ganado', icono: 'entrada' },
    ],
  },
  {
    titulo: 'La finca',
    items: [
      { href: '/finca', texto: 'Criterios', icono: 'criterios' },
      { href: '/exportar', texto: 'Bajar todo a Excel', icono: 'bajar' },
    ],
  },
] as const

type Icono = (typeof GRUPOS)[number]['items'][number]['icono']

const TRAZOS: Record<Icono, string> = {
  chapeta: 'M4 5h11l3 3.5v6.5H4z M8 9h6 M8 12h4',
  potrero: 'M3 4h16v14H3z M11 4v14 M3 11h16',
  bascula: 'M4 18h14 M11 18V7 M11 5v2 M5 12h12l-3-5H8z',
  jeringa: 'M13 4l6 6 M15 6l-9 9-3 4 4-3 9-9 M11 8l4 4',
  salida: 'M13 4H5v15h8 M16 8l4 4-4 4 M9 12h11',
  nota: 'M5 3h9l5 5v13H5z M14 3v5h5 M8 13h8 M8 17h5',
  mover: 'M3 12h15 M13 7l5 5-5 5 M20 5v14',
  entrada: 'M20 12H5 M10 7l-5 5 5 5 M3 5v14',
  criterios: 'M5 7h14 M5 12h14 M5 17h14 M9 7v0 M15 12v0 M8 17v0',
  bajar: 'M12 3v11 M8 11l4 4 4-4 M4 19h16',
}

function Icono({ nombre }: { nombre: Icono }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none opacity-70"
      aria-hidden
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

const CLAVE_CONTRAIDO = 'sofia:menu-contraido'

export function MenuLateral({ quien }: { quien: string }) {
  const ruta = usePathname()
  const [contraido, setContraido] = useState(false)

  // Se recuerda entre visitas, pero la lectura va en un efecto para que el
  // servidor y el navegador rendericen lo mismo en el primer pintado.
  useEffect(() => {
    try {
      setContraido(window.localStorage.getItem(CLAVE_CONTRAIDO) === 'si')
    } catch {
      // Navegador con el almacenamiento bloqueado: el menú abre extendido.
    }
  }, [])

  function alternar() {
    setContraido((antes) => {
      const siguiente = !antes
      try {
        window.localStorage.setItem(CLAVE_CONTRAIDO, siguiente ? 'si' : 'no')
      } catch {
        // Si no se puede guardar, al menos vale para esta visita.
      }
      return siguiente
    })
  }

  return (
    <aside
      data-testid="menu"
      className={`flex flex-none flex-col border-r border-borde bg-papel py-4 ${
        contraido ? 'w-[60px]' : 'w-[212px]'
      }`}
    >
      <Link
        href="/"
        className={`flex items-center gap-[10px] border-b border-borde pb-[14px] no-underline ${
          contraido ? 'justify-center px-2' : 'px-[16px]'
        }`}
      >
        {/* `<img>` y no `next/image`: son dos marcas de 7 KB ya recortadas al
            tamaño final, no hay nada que optimizar, y el optimizador de Next
            no las lee. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/vaca.png" alt="" width={117} height={128} className="h-[52px] w-auto" />
        {!contraido && (
          <span className="text-[17px] font-extrabold tracking-[0.18em] text-monte">SOFIA</span>
        )}
      </Link>

      <nav className="flex flex-col">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            {contraido ? (
              <div className="mx-3 mt-3 border-t border-borde" />
            ) : (
              <div className="rotulo px-[18px] pb-[7px] pt-[18px]">{grupo.titulo}</div>
            )}
            {grupo.items.map((item) => {
              // '/' solo se marca en '/' exacto: con `startsWith` se
              // encendería en todas las rutas a la vez.
              const activo =
                item.href === '/'
                  ? ruta === '/'
                  : ruta === item.href || ruta.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? 'page' : undefined}
                  title={contraido ? item.texto : undefined}
                  className={`flex items-center gap-[10px] py-2 text-[13.5px] no-underline ${
                    contraido ? 'justify-center px-2' : 'px-[18px]'
                  } ${activo ? 'bg-monte font-semibold text-papel' : 'text-carbon-2'}`}
                >
                  <Icono nombre={item.icono} />
                  {!contraido && item.texto}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div
        className={`mt-auto border-t border-borde pt-[14px] ${contraido ? 'px-2' : 'px-[18px]'}`}
      >
        {!contraido && (
          <div className="mb-[10px] flex items-center gap-[9px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/santa-veronica-ojo.png"
              alt=""
              width={198}
              height={96}
              className="h-[15px] w-auto opacity-70"
            />
            <span className="text-[11.5px] leading-tight text-carbon-3">{quien}</span>
          </div>
        )}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!contraido}
          className={`text-[12px] text-carbon-3 ${contraido ? 'w-full text-center' : ''}`}
        >
          {contraido ? '»' : 'Contraer menú'}
        </button>
      </div>
    </aside>
  )
}
