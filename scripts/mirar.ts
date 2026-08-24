/**
 * Toma capturas de las pantallas contra el servidor que esté corriendo, para
 * poder revisarlas sin abrir el navegador a mano.
 *
 * La sesión la abre Playwright, no una persona. Las credenciales llegan por
 * variable de entorno y no van escritas aquí.
 *
 *   CORREO=... CLAVE=... npx tsx scripts/mirar.ts [carpeta-de-salida]
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const CORREO = process.env.CORREO ?? 'joseph@ejemplo.com'
const CLAVE = process.env.CLAVE

const PANTALLAS: { ruta: string; nombre: string }[] = [
  { ruta: '/entrar', nombre: '00-entrar' },
  { ruta: '/', nombre: '01-ganado' },
  { ruta: '/potreros', nombre: '02-potreros' },
  { ruta: '/anotar/pesos', nombre: '03-pesos' },
  { ruta: '/anotar/sanidad', nombre: '04-sanidad' },
  { ruta: '/finca', nombre: '05-criterios' },
]

async function main() {
  if (!CLAVE) {
    console.error('Falta la variable CLAVE.')
    process.exit(1)
  }

  const salida = process.argv[2] ?? path.join(process.cwd(), '.superpowers', 'capturas')
  await mkdir(salida, { recursive: true })

  const navegador = await chromium.launch()
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    // La pantalla de entrar se captura antes de la sesión: después ya no se ve.
    await pagina.goto(`${BASE}/entrar`)
    await pagina.screenshot({ path: path.join(salida, '00-entrar.png'), fullPage: true })

    await pagina.fill('input[name="correo"]', CORREO)
    await pagina.fill('input[name="clave"]', CLAVE)
    await pagina.click('button')
    await pagina.waitForURL((url) => url.pathname === '/')

    for (const pantalla of PANTALLAS.slice(1)) {
      await pagina.goto(`${BASE}${pantalla.ruta}`)
      await pagina.waitForLoadState('networkidle')
      await pagina.screenshot({
        path: path.join(salida, `${pantalla.nombre}.png`),
        fullPage: true,
      })
      console.log(`${pantalla.nombre}.png`)
    }
  } finally {
    await navegador.close()
  }
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
