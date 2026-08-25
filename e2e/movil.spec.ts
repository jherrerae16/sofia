import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.afterAll(async () => {
  await prisma.$disconnect()
})

test.use({ viewport: { width: 390, height: 844 } })

const PANTALLAS = [
  '/',
  '/potreros',
  '/anotar/pesos',
  '/anotar/sanidad',
  '/anotar/salida',
  '/anotar/novedad',
  '/anotar/mover',
  '/anotar/entrada',
  '/finca',
]

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('ninguna pantalla se desplaza en horizontal en un teléfono', async ({ page }) => {
  // El menú lateral medía 212 px fijos y no colapsaba: en una pantalla de 390
  // se comía más de la mitad y TODAS las pantallas desbordaban. Esta prueba
  // existe para que no vuelva a pasar sin que nadie se entere.
  for (const ruta of PANTALLAS) {
    await page.goto(ruta)
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(desborde, `la pantalla ${ruta} se desplaza ${desborde}px en horizontal`).toBeLessThanOrEqual(1)
  }
})

test('en teléfono el menú vive detrás de un botón, no ocupando media pantalla', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('menu')).toBeHidden()

  await page.getByRole('button', { name: 'Abrir el menú' }).click()
  await expect(page.getByTestId('menu')).toBeVisible()
  await expect(page.getByTestId('menu').getByRole('link', { name: 'Sanidad' })).toBeVisible()
})

test('navegar desde el cajón lo cierra, en vez de dejarlo tapando la pantalla', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir el menú' }).click()
  await page.getByTestId('menu').getByRole('link', { name: 'Sanidad' }).click()

  await expect(page).toHaveURL(/\/anotar\/sanidad/)
  await expect(page.getByTestId('menu')).toBeHidden()
})
