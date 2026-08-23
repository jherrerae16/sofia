import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.afterAll(async () => {
  await prisma.$disconnect()
})

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

const REDIRECCIONES = [
  ['/como-vamos', '/'],
  ['/digitar', '/anotar/pesos'],
  ['/salidas', '/anotar/salida'],
  ['/novedades', '/anotar/novedad'],
  ['/lotes', '/anotar/entrada'],
  ['/potreros', '/anotar/mover'],
  ['/configuracion', '/finca'],
] as const

for (const [vieja, nueva] of REDIRECCIONES) {
  test(`${vieja} lleva a ${nueva}`, async ({ page }) => {
    // El dueño tiene enlaces guardados en el navegador desde antes del
    // rediseño: un 404 le cuesta a él encontrar dónde quedó la pantalla.
    await page.goto(vieja)
    await expect(page).toHaveURL(new RegExp(`${nueva.replace(/\//g, '\\/')}$`))
  })
}

test('desde Ganado se llega a los seis modos de Anotar sin que ninguno reviente', async ({
  page,
}) => {
  const modos = ['Pesos', 'Venta o muerte', 'Novedad', 'Mover lote', 'Entrada de ganado', 'Sanidad']
  await page.goto('/')

  for (const modo of modos) {
    await page.getByRole('link', { name: 'Anotar', exact: true }).click()
    await page.getByTestId('modos').getByRole('link', { name: modo, exact: true }).click()
    await expect(page.locator('h1')).toBeVisible()
    // Ninguna pantalla abre con un error crudo en la cara.
    await expect(page.getByText(/Application error|Unhandled Runtime Error/)).toHaveCount(0)
  }
})

test('los tres destinos y la ficha abren sin dejar escapar un valor crudo de enum', async ({
  page,
}) => {
  // Solo las formas que NO pueden ser español correcto: sin tilde o con guion
  // bajo. Si aparecen, salieron del esquema sin pasar por
  // src/ui/etiquetas.ts.
  //
  // Quedan fuera a propósito "suministro", "robado", "ceba" y "levante": son
  // palabras del oficio que la interfaz sí escribe, y buscarlas convertiría
  // esta prueba en una que falla cuando alguien redacta bien.
  const crudos = /\b(bascula|estimacion|desparasitacion|hecho_puntual)\b/

  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  const animal = await prisma.animal.findFirstOrThrow({ where: { loteId: lote.id } })

  for (const ruta of [
    '/',
    '/anotar/pesos',
    '/anotar/salida',
    '/anotar/novedad',
    '/anotar/mover',
    '/anotar/entrada',
    '/anotar/sanidad',
    '/finca',
    `/animales/${animal.id}`,
  ]) {
    await page.goto(ruta)
    await expect(page.locator('body'), `ruta ${ruta}`).not.toContainText(crudos)
  }
})

test('el nombre completo aparece una sola vez en toda la plataforma', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(1)

  for (const ruta of ['/anotar/pesos', '/finca', '/anotar/sanidad']) {
    await page.goto(ruta)
    await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(0)
  }
})
