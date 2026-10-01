import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('la pantalla de entrar tiene etiquetas de verdad, no solo placeholders', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/entrar')

  // `getByLabel` solo encuentra el campo si hay una etiqueta asociada: un
  // placeholder no lo es, y desaparece en cuanto se escribe la primera letra.
  await expect(page.getByLabel('Usuario')).toBeVisible()
  await expect(page.getByLabel('Clave')).toBeVisible()

  await expect(page.getByLabel('Usuario')).toHaveAttribute('autocomplete', 'username')
  await expect(page.getByLabel('Clave')).toHaveAttribute('autocomplete', 'current-password')
})

test('una clave equivocada lo dice, no deja la pantalla muda', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/entrar')

  await page.getByLabel('Usuario').fill('jvargas')
  await page.getByLabel('Clave').fill('esta-no-es')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByTestId('error')).toContainText('no coinciden')
  await expect(page).toHaveURL(/\/entrar/)
})

test('lo que recibe el foco se ve', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/entrar')

  // Se pulsa Tab en vez de hacer clic: `:focus-visible` solo se enciende con
  // el teclado, que es justo el caso que estaba roto.
  await page.keyboard.press('Tab')
  const contorno = await page.evaluate(() => {
    const activo = document.activeElement as HTMLElement | null
    if (!activo) return null
    const estilo = getComputedStyle(activo)
    return { ancho: estilo.outlineWidth, estilo: estilo.outlineStyle }
  })

  expect(contorno).not.toBeNull()
  expect(contorno!.estilo).not.toBe('none')
  expect(parseFloat(contorno!.ancho)).toBeGreaterThan(0)
})

test('con el menú contraído los enlaces siguen teniendo nombre', async ({ page }) => {
  await entrar(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Contraer menú' }).click()

  // El texto se va y el ícono es aria-hidden: sin aria-label el enlace queda
  // mudo para un lector de pantalla.
  await expect(page.getByTestId('menu').getByRole('link', { name: 'Sanidad' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Extender menú' })).toBeVisible()
})

test('las fechas se escriben como se leen, no como las guarda la base', async ({ page }) => {
  await entrar(page)
  await page.goto('/finca')

  // Las hectáreas son el único criterio que la siembra deja con valor
  // vigente, así que es el único que tiene fecha que mostrar.
  const criterio = page.locator('[data-parametro="hectareas_utiles"]')
  await expect(criterio).not.toContainText(/\d{4}-\d{2}-\d{2}/)
  await expect(criterio).toContainText(/\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4}/)
})
