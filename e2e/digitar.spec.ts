import { expect, test } from '@playwright/test'

test('digitar una tanda muestra la ganancia antes de guardar y atrapa el dedazo', async ({ page }) => {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  // El envío pasa por un server action asíncrono: sin esperar a que la
  // redirección a "/" termine, el goto siguiente corta la petición a mitad
  // de camino y la sesión nunca queda establecida.
  await page.waitForURL((url) => url.pathname === '/')

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', '2026-10-01')

  const campos = page.locator('input[name^="peso_"]')
  await campos.nth(0).fill('174')
  await campos.nth(1).fill('900')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText('800 g/día')).toBeVisible()
  await expect(page.getByText(/Revisa que el peso esté bien digitado/)).toBeVisible()
})

test('un pesaje anterior al ingreso del animal no se guarda', async ({ page }) => {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  await page.waitForURL((url) => url.pathname === '/')

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', '2026-08-01')
  await page.locator('input[name^="peso_"]').first().fill('160')
  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText(/anterior al ingreso/)).toBeVisible()
  await expect(
    page.getByText('Corrige las filas en rojo antes de guardar'),
  ).toBeVisible()
})
