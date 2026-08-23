import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

const PARAMETROS = {
  umbral_excelente: '900',
  umbral_bueno: '750',
  umbral_normal: '600',
  umbral_bajo: '400',
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

async function irALaFichaDeUnAnimalConHistoria(page: import('@playwright/test').Page) {
  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/?lote=${lote.id}`)
  await page.getByTestId('tarja').first().click()
}

test.beforeEach(async ({ page }) => {
  await entrar(page)
  await irALaFichaDeUnAnimalConHistoria(page)
})

test('la ficha abre con la chapeta, sus datos de entrada y la vuelta al ganado', async ({
  page,
}) => {
  await expect(page.locator('h1')).toContainText('C2-')
  await expect(page.getByTestId('identidad')).toContainText('Ceba 02')
  await expect(page.getByTestId('identidad')).toContainText('entró')
  await expect(page.getByRole('link', { name: /El ganado/ })).toHaveAttribute('href', '/')
})

test('la cinta trae las cuatro cifras del animal, ninguna vacía', async ({ page }) => {
  const cinta = page.getByTestId('cinta')
  for (const rotulo of ['Peso actual', 'Ha ganado', 'Ganancia diaria', 'Días en finca']) {
    await expect(cinta).toContainText(rotulo)
  }
  await expect(cinta).not.toContainText('NaN')
})

test('la gráfica dibuja su peso contra su propia trayectoria objetivo', async ({ page }) => {
  const grafica = page.getByRole('img', { name: /peso promedio del lote/i })
  await expect(grafica).toBeVisible()
  await expect(grafica.locator('path.meta')).toHaveCount(1)
})

test('la línea de tiempo empieza por lo último y termina en la entrada', async ({ page }) => {
  const sucesos = page.getByTestId('suceso')
  await expect(sucesos.first()).not.toContainText('Entró a la finca')
  await expect(sucesos.last()).toContainText('Entró a la finca')
})

test('la desparasitación del lote aparece en la historia del animal', async ({ page }) => {
  await expect(page.getByTestId('suceso').filter({ hasText: 'Ivermectina' })).toHaveCount(1)
})

test('ninguna pantalla de la ficha deja escapar un valor crudo de enum', async ({ page }) => {
  const sucesos = page.getByTestId('suceso')
  await expect(sucesos.filter({ hasText: /Pesaje con cinta bovinométrica/ }).first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Pesaje con cinta$/)
})

test('desde la ficha se llega a anotarle el peso y a registrar su salida', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Anotar su peso' })).toHaveAttribute(
    'href',
    /\/anotar\/pesos/,
  )
  await expect(page.getByRole('link', { name: 'Registrar su salida' })).toHaveAttribute(
    'href',
    /\/anotar\/salida/,
  )
})

test('un animal que va quedado lo dice en su ficha, no solo en la lista', async ({ page }) => {
  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/?lote=${lote.id}&filtro=quedados`)
  await page.getByTestId('tarja').first().click()

  await expect(page.getByTestId('sello')).toContainText('No está engordando')
})
