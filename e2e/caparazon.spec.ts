import { expect, test } from '@playwright/test'
import { entrar } from './sesion'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('el encabezado ofrece exactamente tres destinos', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header nav a')).toHaveText(['Ganado', 'Anotar', 'Finca'])
})

test('el destino en el que estás queda marcado, y solo ese', async ({ page }) => {
  await page.goto('/anotar/pesos')
  await expect(page.locator('header nav a[aria-current="page"]')).toHaveText(['Anotar'])
})

test('estando en Ganado no se marca ningún otro destino', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header nav a[aria-current="page"]')).toHaveText(['Ganado'])
})

test('/anotar cae en el modo Pesos', async ({ page }) => {
  await page.goto('/anotar')
  await expect(page).toHaveURL(/\/anotar\/pesos$/)
})

test('el nombre completo aparece una sola vez, y solo al pie de Ganado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(1)

  await page.goto('/finca')
  await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(0)
})
