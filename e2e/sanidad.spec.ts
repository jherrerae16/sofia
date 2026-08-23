import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function irASanidadDeCeba02(page: import('@playwright/test').Page) {
  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/anotar/sanidad?lote=${lote.id}`)
}

test.beforeEach(async ({ page }) => {
  await entrar(page)
  await irASanidadDeCeba02(page)
})

test('anotar una vitamina a todo el lote deja una anotación por animal', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('vitamina')
  await page.getByLabel('Producto').fill('Complejo B')
  await page.getByLabel('Dosis').fill('5 ml')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')

  // El resumen dice exactamente qué va a pasar ANTES de guardar.
  await expect(page.getByTestId('resumen')).toContainText('14 anotaciones')

  await page.getByRole('button', { name: /^Guardar/ }).click()

  await expect(page.getByTestId('ultimas')).toContainText('Complejo B')
  await expect(page.getByTestId('ultimas')).toContainText('14 animales')
})

test('se puede aplicar solo a unas chapetas sueltas', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('tratamiento')
  await page.getByLabel('Producto').fill('Oxitetraciclina')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel('Solo algunos').check()

  const primera = page.getByTestId('candidato').first()
  const chapeta = (await primera.innerText()).trim()
  await primera.getByRole('checkbox').check()

  await expect(page.getByTestId('resumen')).toContainText('1 anotación')
  await page.getByRole('button', { name: /^Guardar/ }).click()

  await expect(page.getByTestId('ultimas')).toContainText(`Solo ${chapeta}`)
})

test('un animal que no había entrado sale apagado y con la razón', async ({ page }) => {
  // La siembra entró a los animales hace 90 días; en enero de 2020 no estaba
  // ninguno.
  await page.getByLabel('Fecha').fill('2020-01-15')
  await page.getByLabel('Solo algunos').check()

  const fuera = page.getByTestId('candidato-fuera').first()
  await expect(fuera).toContainText('entró a la finca')
  await expect(fuera.getByRole('checkbox')).toBeDisabled()
})

test('sin producto no se guarda, y no se pierde lo ya escrito', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('vacuna')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByRole('button', { name: /^Guardar/ }).click()

  await expect(page.getByTestId('error')).toContainText('producto')
  await expect(page.getByLabel('Quién lo aplicó')).toHaveValue('Joseph')
})

test('anular una tanda la saca de la lista y apaga su aviso en Ganado', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('desparasitacion')
  await page.getByLabel('Producto').fill('Levamisol')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel('Vuelve a tocar el').fill('2020-01-01')
  await page.getByRole('button', { name: /^Guardar/ }).click()
  await expect(page.getByTestId('ultimas')).toContainText('Levamisol')

  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/?lote=${lote.id}`)
  await expect(page.getByTestId('avisos')).toContainText('Levamisol')

  await irASanidadDeCeba02(page)
  const fila = page.getByTestId('aplicacion').filter({ hasText: 'Levamisol' })
  await fila.getByRole('button', { name: 'Anular' }).click()
  await fila.getByLabel('Motivo').fill('Se anotó el producto equivocado')
  await fila.getByRole('button', { name: 'Anular la aplicación' }).click()

  await expect(page.getByTestId('ultimas')).not.toContainText('Levamisol')

  await page.goto(`/?lote=${lote.id}`)
  await expect(page.getByTestId('avisos')).not.toContainText('Levamisol')
})

test('anular sin motivo no anula nada', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('vacuna')
  await page.getByLabel('Producto').fill('Carbón sintomático')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByRole('button', { name: /^Guardar/ }).click()

  const fila = page.getByTestId('aplicacion').filter({ hasText: 'Carbón sintomático' })
  await fila.getByRole('button', { name: 'Anular' }).click()
  await fila.getByRole('button', { name: 'Anular la aplicación' }).click()

  await expect(fila.getByTestId('error')).toContainText('motivo')
  await expect(page.getByTestId('ultimas')).toContainText('Carbón sintomático')
})
