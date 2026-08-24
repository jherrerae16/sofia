import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

const PARAMETROS = {
  gdp_objetivo: '750',
}

test.beforeAll(async () => {
  await prisma.parametro.deleteMany({ where: { clave: { in: Object.keys(PARAMETROS) } } })
  for (const [clave, valor] of Object.entries(PARAMETROS)) {
    await prisma.parametro.create({
      data: { clave, valor, vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })
  }
})

test.afterAll(async () => {
  await prisma.parametro.deleteMany({ where: { clave: { in: Object.keys(PARAMETROS) } } })
  await prisma.$disconnect()
})

async function irAlLoteConHistoria(page: import('@playwright/test').Page) {
  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/?lote=${lote.id}`)
  return lote
}

/**
 * El modo selección vive en la dirección web, así que encenderlo es una vuelta
 * al servidor. Se espera a que el botón cambie de nombre antes de seguir: sin
 * eso el clic siguiente cae sobre las tarjetas todavía en modo enlace.
 */
async function entrarEnModoSeleccion(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Seleccionar animales' }).click()
  await expect(page.getByRole('button', { name: 'Salir de selección' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('sin modo selección, una tarjeta lleva a la ficha del animal', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await page.getByTestId('tarja').first().click()
  await expect(page).toHaveURL(/\/animales\//)
})

test('en modo selección la tarjeta marca en vez de navegar', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)

  const primera = page.getByTestId('tarja').first()
  await primera.click()

  // Un enlace que a veces navega y a veces marca es la forma más rápida de
  // que alguien abra una ficha sin querer.
  await expect(page).not.toHaveURL(/\/animales\//)
  await expect(primera).toHaveAttribute('aria-pressed', 'true')
})

test('la barra de acciones cuenta lo marcado y solo aparece cuando hay algo marcado', async ({
  page,
}) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)
  await expect(page.getByTestId('barra-seleccion')).toHaveCount(0)

  const tarjas = page.getByTestId('tarja')
  await tarjas.nth(0).click()
  await tarjas.nth(1).click()
  await tarjas.nth(2).click()

  await expect(page.getByTestId('barra-seleccion')).toContainText('3 seleccionados')
})

test('quitar la selección apaga la barra', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)
  await page.getByTestId('tarja').first().click()
  await expect(page.getByTestId('barra-seleccion')).toBeVisible()

  await page.getByRole('button', { name: 'Quitar selección' }).click()
  await expect(page.getByTestId('barra-seleccion')).toHaveCount(0)
})

test('anotarles peso llega a Pesos con solo esos animales en la tabla', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)

  const tarjas = page.getByTestId('tarja')
  const chapetas = [
    (await tarjas.nth(0).innerText()).split('\n')[0].trim(),
    (await tarjas.nth(1).innerText()).split('\n')[0].trim(),
  ]
  await tarjas.nth(0).click()
  await tarjas.nth(1).click()

  await page.getByRole('link', { name: 'Anotarles peso' }).click()

  // No basta con que la dirección lleve los identificadores: la pantalla tiene
  // que mostrar SOLO esos dos. Si llega con los catorce, la selección no
  // sirvió de nada y hay que volver a buscarlos a mano.
  await expect(page).toHaveURL(/\/anotar\/pesos/)
  const filas = page.locator('input[name^="peso_"]')
  await expect(filas).toHaveCount(2)
  for (const chapeta of chapetas) {
    await expect(page.getByText(chapeta, { exact: true })).toBeVisible()
  }
})

test('registrar su salida llega a Salidas con solo esos animales', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)
  await page.getByTestId('tarja').first().click()

  await page.getByRole('link', { name: 'Registrar su salida' }).click()

  await expect(page).toHaveURL(/\/anotar\/salida/)
  await expect(page.locator('input[name^="sel_"]')).toHaveCount(1)
})

test('aplicarles sanidad llega a Sanidad con esos animales ya marcados', async ({ page }) => {
  await irAlLoteConHistoria(page)
  await entrarEnModoSeleccion(page)
  await page.getByTestId('tarja').nth(0).click()
  await page.getByTestId('tarja').nth(1).click()

  await page.getByRole('link', { name: 'Aplicarles sanidad' }).click()

  await expect(page).toHaveURL(/\/anotar\/sanidad/)
  // Llega en modo "solo algunos" y con los dos ya marcados: el resumen lo dice
  // antes de guardar.
  await expect(page.getByLabel('Solo algunos')).toBeChecked()
  await expect(page.getByTestId('resumen')).toContainText('2 anotaciones')
})

test('la pantalla de entrar carga el logo de la finca de verdad', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/entrar')

  const logo = page.getByAltText('Ganadería Santa Verónica')
  await expect(logo).toBeVisible()
  // `toBeVisible` da verde con una imagen rota: el texto alternativo ocupa
  // espacio igual. Lo que demuestra que cargó es que tenga ancho real -- y
  // esta imagen la sirve una ruta que el middleware protegía, así que sin la
  // exclusión el logo salía roto en la puerta de la finca.
  expect(await logo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)

  await expect(page.getByTestId('menu')).toHaveCount(0)
})
