import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

test.afterAll(async () => {
  await prisma.$disconnect()
})

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('las hectáreas de un potrero se muestran en formato colombiano, con coma y un decimal fijo', async ({
  page,
}) => {
  // Un potrero con decimal (7.5 -> "7,5") y uno sin decimal (8 -> "8,0"):
  // Postgres y JS los mostraban "7.5" y "8" tal cual, con punto y sin decimal
  // fijo -- el único número de la plataforma que se escapaba del formateador
  // colombiano que ya usa el resto de las pantallas.
  await prisma.potrero.deleteMany({ where: { nombre: { startsWith: 'Potreros — ' } } })
  await prisma.potrero.create({
    data: { nombre: 'Potreros — con decimal', hectareas: 7.5, capacidadKg: 1000 },
  })
  await prisma.potrero.create({
    data: { nombre: 'Potreros — sin decimal', hectareas: 8, capacidadKg: 1000 },
  })

  await page.goto('/potreros')

  await expect(
    page.getByTestId('potrero').filter({ hasText: 'Potreros — con decimal' }),
  ).toContainText('7,5 ha')
  await expect(
    page.getByTestId('potrero').filter({ hasText: 'Potreros — sin decimal' }),
  ).toContainText('8,0 ha')
})

test('un potrero ocupado dice qué lote tiene encima y hace cuántos días', async ({ page }) => {
  await page.goto('/potreros')
  const ocupado = page.getByTestId('potrero').filter({ hasText: 'La Loma' })
  await expect(ocupado).toContainText('Ceba 02')
  await expect(ocupado).toContainText('días')
  await expect(ocupado).toContainText('kg encima')
})

test('un potrero vacío dice que está descansando, no que tiene cero lotes', async ({ page }) => {
  await prisma.potrero.deleteMany({ where: { nombre: 'El Jobo' } })
  await prisma.potrero.create({ data: { nombre: 'El Jobo', hectareas: 7.5, capacidadKg: 6000 } })

  await page.goto('/potreros')
  await expect(page.getByTestId('potrero').filter({ hasText: 'El Jobo' })).toContainText(
    'Descansando',
  )
})

test('desde Potreros se puede agregar un potrero', async ({ page }) => {
  await prisma.potrero.deleteMany({ where: { nombre: 'Potrero Nuevo' } })
  await page.goto('/potreros')

  await page.getByLabel('Nombre').fill('Potrero Nuevo')
  await page.getByLabel('Hectáreas').fill('4,5')
  await page.getByLabel('Capacidad').fill('3000')
  await page.getByRole('button', { name: 'Agregar el potrero' }).click()

  await expect(page.getByTestId('potrero').filter({ hasText: 'Potrero Nuevo' })).toContainText(
    '4,5 ha',
  )
})
