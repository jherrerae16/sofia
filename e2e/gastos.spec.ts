import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.beforeAll(async () => {
  await prisma.gasto.deleteMany()
})

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('anotar dos gastos seguidos, ver el total del mes y anular uno', async ({ page }) => {
  await entrar(page)
  await page.goto('/anotar/gasto')
  await expect(page.getByTestId('total-mes')).toHaveText('$0')

  // Sin valor: se rechaza y lo escrito no se pierde.
  await page.getByLabel('Qué fue').fill('Recibo de luz')
  await page.getByRole('button', { name: 'Anotar' }).click()
  await expect(page.getByText('Falta el valor')).toBeVisible()
  await expect(page.getByLabel('Qué fue')).toHaveValue('Recibo de luz')

  // El valor se escribe sin puntos y la casilla los pone sola.
  await page.getByLabel('Valor').fill('312400')
  await expect(page.getByLabel('Valor')).toHaveValue('312.400')
  await page.getByRole('button', { name: 'Anotar' }).click()
  await expect(page.getByText('Se anotó: Recibo de luz, $312.400.')).toBeVisible()
  // Después de anotar, el foco vuelve a "Qué fue" para seguir con la tanda.
  await expect(page.getByLabel('Qué fue')).toBeFocused()
  await expect(page.getByLabel('Qué fue')).toHaveValue('')

  await page.getByLabel('Qué fue').fill('Peajes de Joseph')
  await page.getByLabel('Valor').fill('240000')
  await page.getByRole('button', { name: 'Anotar' }).click()
  await expect(page.getByTestId('total-mes')).toHaveText('$552.400')

  await page.getByRole('row', { name: /Peajes de Joseph/ }).getByRole('button', { name: 'Anular' }).click()
  await page.getByLabel('Por qué se anula').fill('Estaba repetido')
  await page.getByRole('button', { name: 'Confirmar anulación' }).click()

  await expect(page.getByTestId('total-mes')).toHaveText('$312.400')
  await expect(page.getByText('Anulado: Estaba repetido')).toBeVisible()
  await expect(page.getByTestId('total-tabla')).toHaveText('$312.400')
})
