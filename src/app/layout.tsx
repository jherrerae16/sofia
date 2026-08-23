import type { Metadata } from 'next'
import { Archivo, Archivo_Narrow } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { auth } from '@/auth'
import { obtenerFinca } from '@/datos/finca'
import { Navegacion } from '@/ui/Navegacion'

const interfaz = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '800'],
  variable: '--fuente-interfaz',
})
const estrecha = Archivo_Narrow({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--fuente-estrecha',
})

export const metadata: Metadata = {
  title: 'SOFÍA',
  description: 'Control integral de la finca Santa Verónica',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Quién está adentro y en qué finca. Ninguno de los dos se inventa: si
  // todavía no hay finca creada o nadie ha entrado, ese pedazo no se escribe
  // en vez de mostrar un nombre en blanco o un separador suelto.
  const sesion = await auth()
  const finca = await obtenerFinca()
  const quien = [finca?.nombre, sesion?.user?.name].filter(Boolean).join(' · ')

  return (
    <html lang="es-CO" className={`${interfaz.variable} ${estrecha.variable}`}>
      <body>
        <div className="mx-auto max-w-[1120px] px-7">
          <header className="flex items-center justify-between border-b border-borde py-[22px]">
            <Link
              href="/"
              className="text-[18px] font-extrabold tracking-[0.2em] text-monte no-underline"
            >
              SOFÍA
            </Link>
            <Navegacion />
            <div className="text-[12.5px] text-carbon-3">{quien}</div>
          </header>
        </div>
        {children}
      </body>
    </html>
  )
}
