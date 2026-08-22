import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'

test.afterAll(async () => {
  await prisma.$disconnect()
})

async function iniciarSesion(page: import('@playwright/test').Page) {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  await page.waitForURL((url) => url.pathname === '/')
}

test('las hectáreas de un potrero se muestran en formato colombiano, con coma y un decimal fijo', async ({
  page,
}) => {
  // Un potrero con decimal (7.5 -> "7,5") y uno sin decimal (8 -> "8,0"):
  // antes del arreglo, Postgres/JS mostraban "7.5" y "8" tal cual, con punto
  // y sin decimal fijo -- el único número de la plataforma que se escapaba
  // del formateador colombiano que ya usa el resto de las pantallas.
  await prisma.potrero.create({
    data: { nombre: 'Potreros — con decimal', hectareas: 7.5, capacidadKg: 1000 },
  })
  await prisma.potrero.create({
    data: { nombre: 'Potreros — sin decimal', hectareas: 8, capacidadKg: 1000 },
  })

  await iniciarSesion(page)
  await page.goto('/potreros')

  const filaConDecimal = page.getByRole('row', { name: /Potreros — con decimal/ })
  const filaSinDecimal = page.getByRole('row', { name: /Potreros — sin decimal/ })

  await expect(filaConDecimal.getByRole('cell', { name: '7,5' })).toBeVisible()
  await expect(filaSinDecimal.getByRole('cell', { name: '8,0' })).toBeVisible()
})
