import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const titulos = Fraunces({ subsets: ['latin'], variable: '--font-titulos' })
const interfaz = Inter({ subsets: ['latin'], variable: '--font-interfaz' })

export const metadata: Metadata = {
  title: 'SOFÍA',
  description: 'Control integral de la finca Santa Verónica',
}

const ENLACES = [
  { href: '/', texto: 'Hoy' },
  { href: '/como-vamos', texto: 'Cómo vamos' },
  { href: '/digitar', texto: 'Digitar' },
  { href: '/salidas', texto: 'Salidas' },
  { href: '/lotes', texto: 'Lotes' },
  { href: '/potreros', texto: 'Potreros' },
  { href: '/configuracion', texto: 'Configuración' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${titulos.variable} ${interfaz.variable}`}>
      <body>
        <header className="border-b border-tierra/20 bg-pasto text-white">
          <nav className="flex flex-wrap items-center gap-4 p-4">
            <span className="font-serif text-xl">SOFÍA</span>
            {ENLACES.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="text-sm hover:underline">
                {enlace.texto}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
