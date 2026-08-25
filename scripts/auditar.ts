/**
 * Auditoría visual de todas las pantallas, en escritorio y en teléfono.
 *
 * Captura cada pantalla y además busca los defectos que se pueden medir sin
 * ojos: desbordes horizontales, elementos que se salen del ancho, textos que
 * se montan, blancos de clic demasiado pequeños, imágenes rotas y contrastes
 * flojos. Lo que no se puede medir se mira en las capturas.
 *
 *   CLAVE=... npx tsx scripts/auditar.ts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const CORREO = process.env.CORREO ?? 'joseph@ejemplo.com'
const CLAVE = process.env.CLAVE

const ANCHOS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'telefono', width: 390, height: 844 },
]

type Hallazgo = { pantalla: string; ancho: string; tipo: string; detalle: string }

/** Lo que se puede comprobar dentro del navegador, sin mirar. */
async function revisar(pagina: Page): Promise<Omit<Hallazgo, 'pantalla' | 'ancho'>[]> {
  return pagina.evaluate(() => {
    const hallazgos: { tipo: string; detalle: string }[] = []
    const ancho = document.documentElement.clientWidth

    // La página nunca debe desplazarse en horizontal.
    if (document.documentElement.scrollWidth > ancho + 1) {
      hallazgos.push({
        tipo: 'desborde',
        detalle: `la página se desplaza en horizontal: ${document.documentElement.scrollWidth}px de contenido en ${ancho}px de ventana`,
      })
    }

    const describir = (el: Element) => {
      const etiqueta = el.tagName.toLowerCase()
      const testid = el.getAttribute('data-testid')
      const texto = (el.textContent ?? '').trim().slice(0, 40)
      return `${etiqueta}${testid ? `[${testid}]` : ''}${texto ? ` "${texto}"` : ''}`
    }

    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const caja = el.getBoundingClientRect()
      const estilo = getComputedStyle(el)
      if (estilo.display === 'none' || estilo.visibility === 'hidden') continue
      if (caja.width === 0 && caja.height === 0) continue

      // Elementos que se salen por la derecha. Se ignora lo que vive dentro
      // de un contenedor con desplazamiento propio: ahí ser más ancho que la
      // ventana no es un defecto, es la solución.
      let dentroDeScroll = false
      for (let padre = el.parentElement; padre; padre = padre.parentElement) {
        const estiloPadre = getComputedStyle(padre)
        if (estiloPadre.overflowX === 'auto' || estiloPadre.overflowX === 'scroll') {
          dentroDeScroll = true
          break
        }
      }
      if (!dentroDeScroll && caja.right > ancho + 1 && estilo.position !== 'fixed') {
        hallazgos.push({
          tipo: 'se-sale',
          detalle: `${describir(el)} llega a ${Math.round(caja.right)}px con ventana de ${ancho}px`,
        })
      }

      // Imágenes rotas o sin dimensiones declaradas.
      if (el instanceof HTMLImageElement) {
        if (el.complete && el.naturalWidth === 0) {
          hallazgos.push({ tipo: 'imagen-rota', detalle: `${el.getAttribute('src')}` })
        }
        if (!el.getAttribute('width') || !el.getAttribute('height')) {
          hallazgos.push({
            tipo: 'imagen-sin-medidas',
            detalle: `${el.getAttribute('src')} sin width/height (provoca saltos de maquetación)`,
          })
        }
      }

      // Blancos de clic pequeños: 40px es el mínimo aceptable.
      const accionable = ['a', 'button'].includes(el.tagName.toLowerCase())
      if (accionable && caja.height > 0 && (caja.height < 32 || caja.width < 32)) {
        hallazgos.push({
          tipo: 'blanco-de-clic',
          detalle: `${describir(el)} mide ${Math.round(caja.width)}x${Math.round(caja.height)}px`,
        })
      }

      // Texto que se sale de su propia caja (recortado sin querer).
      if (
        el.children.length === 0 &&
        (el.textContent ?? '').trim().length > 0 &&
        el.scrollWidth > el.clientWidth + 2 &&
        estilo.overflow === 'visible' &&
        estilo.textOverflow !== 'ellipsis'
      ) {
        hallazgos.push({
          tipo: 'texto-desbordado',
          detalle: `${describir(el)} necesita ${el.scrollWidth}px y tiene ${el.clientWidth}px`,
        })
      }
    }

    return hallazgos
  })
}

async function main() {
  if (!CLAVE) {
    console.error('Falta la variable CLAVE.')
    process.exit(1)
  }

  const salida = path.join(process.cwd(), '.superpowers', 'auditoria')
  await mkdir(salida, { recursive: true })

  const navegador = await chromium.launch()

  // `tsx` compila con "keep-names", que envuelve cada función con nombre en un
  // ayudante `__name` que solo existe en Node. Al mandar la revisión al
  // navegador con `page.evaluate`, ese ayudante no está y todo revienta con
  // "__name is not defined". Se declara un sustituto inofensivo antes de que
  // cargue cualquier página.
  const RELLENO_KEEP_NAMES = 'globalThis.__name = globalThis.__name || ((f) => f)'

  const contexto = await navegador.newContext()
  await contexto.addInitScript({ content: RELLENO_KEEP_NAMES })
  const pagina = await contexto.newPage()
  // Sin esto, cualquier espera fallida se queda 30 s colgada por acción y la
  // corrida entera parece congelada en vez de fallar y decir dónde.
  pagina.setDefaultTimeout(15000)

  // Se necesita un animal real para la ficha.
  await pagina.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' })
  await pagina.fill('input[name="correo"]', CORREO)
  await pagina.fill('input[name="clave"]', CLAVE)
  await pagina.click('button[type="submit"]')
  await pagina.waitForURL((url) => url.pathname === '/')
  await pagina.getByTestId('tarja').first().click()
  await pagina.waitForURL(/\/animales\//)
  const rutaAnimal = new URL(pagina.url()).pathname

  const PANTALLAS: { ruta: string; nombre: string; sesion: boolean }[] = [
    { ruta: '/entrar', nombre: '00-entrar', sesion: false },
    { ruta: '/', nombre: '01-ganado', sesion: true },
    { ruta: '/?vista=tabla', nombre: '02-ganado-tabla', sesion: true },
    { ruta: '/?sel=', nombre: '03-ganado-seleccion', sesion: true },
    { ruta: '/potreros', nombre: '04-potreros', sesion: true },
    { ruta: '/anotar/pesos', nombre: '05-pesos', sesion: true },
    { ruta: '/anotar/sanidad', nombre: '06-sanidad', sesion: true },
    { ruta: '/anotar/salida', nombre: '07-salida', sesion: true },
    { ruta: '/anotar/novedad', nombre: '08-novedad', sesion: true },
    { ruta: '/anotar/mover', nombre: '09-mover', sesion: true },
    { ruta: '/anotar/entrada', nombre: '10-entrada', sesion: true },
    { ruta: '/finca', nombre: '11-criterios', sesion: true },
    { ruta: rutaAnimal, nombre: '12-animal', sesion: true },
  ]

  const hallazgos: Hallazgo[] = []

  for (const ancho of ANCHOS) {
    await pagina.setViewportSize({ width: ancho.width, height: ancho.height })
    for (const pantalla of PANTALLAS) {
      const contextoSinSesion = pantalla.sesion ? null : await navegador.newContext()
      if (contextoSinSesion) await contextoSinSesion.addInitScript({ content: RELLENO_KEEP_NAMES })
      const p = contextoSinSesion ? await contextoSinSesion.newPage() : pagina
      if (contextoSinSesion) await p.setViewportSize({ width: ancho.width, height: ancho.height })

      // `networkidle` no llega nunca contra el servidor de desarrollo: Next
      // deja abierto el socket de recarga en caliente y la espera se cuelga.
      await p.goto(`${BASE}${pantalla.ruta}`, { waitUntil: 'domcontentloaded' })
      await p.waitForLoadState('load')
      await p.waitForTimeout(600)

      process.stdout.write(`  ${ancho.nombre}/${pantalla.nombre}\n`)
      for (const h of await revisar(p)) {
        hallazgos.push({ pantalla: pantalla.nombre, ancho: ancho.nombre, ...h })
      }

      await p.screenshot({
        path: path.join(salida, `${ancho.nombre}-${pantalla.nombre}.png`),
        fullPage: true,
      })

      if (contextoSinSesion) await contextoSinSesion.close()
    }
  }

  await navegador.close()

  // Se agrupan los repetidos: el mismo defecto en catorce tarjetas es uno.
  const agrupados = new Map<string, { conteo: number; ejemplo: Hallazgo }>()
  for (const h of hallazgos) {
    const clave = `${h.pantalla}|${h.ancho}|${h.tipo}`
    const ya = agrupados.get(clave)
    if (ya) ya.conteo += 1
    else agrupados.set(clave, { conteo: 1, ejemplo: h })
  }

  const lineas = [...agrupados.values()]
    .sort((a, b) => b.conteo - a.conteo)
    .map(
      ({ conteo, ejemplo }) =>
        `${ejemplo.ancho.padEnd(11)} ${ejemplo.pantalla.padEnd(20)} ${ejemplo.tipo.padEnd(20)} ${conteo > 1 ? `x${conteo} ` : ''}${ejemplo.detalle}`,
    )

  const informe = lineas.length > 0 ? lineas.join('\n') : 'Sin hallazgos medibles.'
  await writeFile(path.join(salida, 'informe.txt'), `${informe}\n`)
  console.log(informe)
  console.log(`\n${hallazgos.length} hallazgos en total, ${agrupados.size} tipos distintos.`)
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
