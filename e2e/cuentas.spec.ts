import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'

test.afterAll(async () => {
  await prisma.$disconnect()
})

// `e2e/preparar.ts` siembra solo la fila de jvargas. La de jherrera no
// existe hasta que entra por primera vez: es el caso de la base recién
// migrada en Vercel, donde nadie corre ningún script para crear cuentas.
test('la segunda cuenta entra sin que nadie la haya creado antes', async ({ page }) => {
  await page.context().clearCookies()
  await prisma.usuario.deleteMany({ where: { usuario: 'jherrera' } })

  await page.goto('/entrar')
  await page.getByLabel('Usuario').fill('JHerrera')
  await page.getByLabel('Clave').fill('claveDePruebaJherrera')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname === '/')

  const fila = await prisma.usuario.findUniqueOrThrow({ where: { usuario: 'jherrera' } })
  expect(fila.nombre).toBe('Juan David')
})

test('la clave de una cuenta no abre la otra', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/entrar')
  await page.getByLabel('Usuario').fill('jherrera')
  await page.getByLabel('Clave').fill('claveDePrueba')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByTestId('error')).toContainText('no coinciden')
})
