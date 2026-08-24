import { expect, test } from '@playwright/test'
import { entrar } from './sesion'

test.describe('sin haber entrado', () => {
  test('la pantalla de entrar no ofrece destinos ni dice de qué finca es', async ({ page }) => {
    await page.goto('/entrar')

    // Ofrecer Ganado, Anotar y Finca a quien no ha entrado es ofrecer puertas
    // cerradas. Y el nombre de la finca es un dato de adentro: no tiene por
    // qué leerlo cualquiera que abra la dirección.
    await expect(page.getByTestId('menu')).toHaveCount(0)
    await expect(page.getByText('Santa Verónica', { exact: false })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})

test.describe('con la sesión abierta', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page)
  })

  test('el menú lateral ofrece las diez funciones, cada una a un clic', async ({ page }) => {
    await page.goto('/')
    // Planas, sin submenús: pesar o aplicar una vacuna costaba dos pasos
    // (entrar a Anotar y escoger el modo) y ahora cuesta uno.
    await expect(page.getByTestId('menu').locator('nav a')).toHaveText([
      'Ganado',
      'Potreros',
      'Pesos',
      'Sanidad',
      'Venta o muerte',
      'Novedad',
      'Mover lote',
      'Entrada de ganado',
      'Criterios',
      'Bajar todo a Excel',
    ])
  })

  test('el menú se puede contraer y se recuerda al volver', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Contraer menú' }).click()
    await expect(page.getByTestId('menu').getByText('Sanidad')).toHaveCount(0)

    await page.goto('/anotar/pesos')
    await expect(page.getByTestId('menu').getByText('Sanidad')).toHaveCount(0)
  })

  test('el destino en el que estás queda marcado, y solo ese', async ({ page }) => {
    await page.goto('/anotar/pesos')
    await expect(page.getByTestId('menu').locator('[aria-current="page"]')).toHaveText(['Pesos'])
  })

  test('estando en Ganado no se marca ningún otro destino', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('menu').locator('[aria-current="page"]')).toHaveText(['Ganado'])
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
})
