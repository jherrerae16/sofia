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
  // La cabecera es de adentro. Sin sesión no se pinta: ofrecer Ganado, Anotar
  // y Finca a quien no ha entrado es ofrecer puertas cerradas, y el nombre de
  // la finca es un dato que no tiene por qué leer cualquiera que abra la
  // dirección.
  //
  // `auth()` puede fallar sin que nadie haya hecho nada mal -- una cookie
  // firmada con otro AUTH_SECRET, por ejemplo, al cambiar de entorno --, y eso
  // no puede tumbar la aplicación entera desde el layout raíz: se trata igual
  // que no haber entrado.
  const sesion = await auth().catch(() => null)
  const finca = sesion ? await obtenerFinca() : null
  const quien = [finca?.nombre, sesion?.user?.name].filter(Boolean).join(' · ')

  return (
    <html lang="es-CO" className={`${interfaz.variable} ${estrecha.variable}`}>
      <body>
        {sesion && (
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
        )}
        {children}
      </body>
    </html>
  )
}
