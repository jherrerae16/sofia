import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { prisma } from '../src/datos/cliente'

// playwright.config.ts ya cargó .env.test con override antes de que este
// archivo se importara, así que `prisma` aquí apunta a la misma base de
// pruebas que usa la app bajo prueba.
test.afterAll(async () => {
  await prisma.$disconnect()
})

// e2e/preparar.ts siembra la fecha de entrada de los animales 30 días atrás
// de hoy (ver el comentario allá) -- estas pruebas usan las mismas fechas
// relativas, no fechas absolutas, para no volver a caducar contra el reloj
// real como ya le pasó a este archivo con `2026-10-01`/`2026-08-01`.
const HOY = hoyBogota()

async function iniciarSesion(page: import('@playwright/test').Page) {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  // El envío pasa por un server action asíncrono: sin esperar a que la
  // redirección a "/" termine, el goto siguiente corta la petición a mitad
  // de camino y la sesión nunca queda establecida.
  await page.waitForURL((url) => url.pathname === '/')
}

test('digitar una tanda muestra la ganancia antes de guardar y atrapa el dedazo', async ({ page }) => {
  await iniciarSesion(page)

  await page.goto('/digitar')
  // Hoy mismo: 30 días después de la entrada sembrada (150 kg), igual que
  // antes de este arreglo, solo que relativa en vez de fija.
  await page.fill('input[name="fecha"]', HOY)

  const campos = page.locator('input[name^="peso_"]')
  await campos.nth(0).fill('174')
  await campos.nth(1).fill('900')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText('800 g/día')).toBeVisible()
  await expect(page.getByText(/Revisa que el peso esté bien digitado/)).toBeVisible()
})

test('un pesaje anterior al ingreso del animal no se guarda', async ({ page }) => {
  await iniciarSesion(page)

  await page.goto('/digitar')
  // 5 días antes de la entrada sembrada (30 días atrás de hoy): siempre
  // anterior al ingreso, sin importar cuándo corra esta prueba.
  await page.fill('input[name="fecha"]', sumarDias(HOY, -35))
  await page.locator('input[name^="peso_"]').first().fill('160')
  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText(/anterior al ingreso/)).toBeVisible()
  await expect(
    page.getByText('Corrige las filas en rojo antes de guardar'),
  ).toBeVisible()

  // No basta con que la pantalla lo diga: si el guardia se rompiera
  // manteniendo el mismo texto de error, esta prueba seguiría en verde sin
  // esto. Se consulta la base directamente para demostrar que en efecto no
  // se guardó ningún pesaje ni ninguna medición.
  expect(await prisma.pesaje.count()).toBe(0)
  expect(await prisma.medicion.count()).toBe(0)
})
