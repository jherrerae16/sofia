import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'
import { prisma } from '../src/datos/cliente'

// Mismo motivo que en los demás archivos de e2e: fechas relativas a hoy.
const HOY = hoyBogota()

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

test('una chapeta ya activa en otro lote se rechaza sin perder la planilla, y se puede corregir', async ({
  page,
}) => {
  const loteOrigen = await prisma.lote.create({
    data: { nombre: 'Lotes — origen', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -60)) },
  })
  await prisma.animal.create({
    data: {
      chapeta: '850',
      loteId: loteOrigen.id,
      sexo: 'macho',
      fechaEntrada: aFechaDb(sumarDias(HOY, -60)),
      pesoEntradaKg: 150,
    },
  })
  const loteDestino = await prisma.lote.create({
    data: { nombre: 'Lotes — destino', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -1)) },
  })

  await iniciarSesion(page)
  await page.goto('/lotes')

  await page.selectOption('select[name="loteId"]', loteDestino.id)
  await page.fill('input[name="fechaEntrada"]', HOY)
  await page.fill('textarea[name="planilla"]', '850 150\n851 160')

  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()

  // El mensaje tiene que decir de cuál animal se trata -- lote, fecha de
  // entrada y (si lo tiene) último peso -- no un genérico "chapeta duplicada".
  const conflicto = page.getByRole('listitem').filter({ hasText: '850' })
  await expect(conflicto).toContainText('Lotes — origen')
  await expect(conflicto).toContainText('sin pesaje todavía')

  // La planilla completa sigue en pantalla -- no se vació con el rechazo --
  // así que corregir solo la línea en conflicto no obliga a pegarla de nuevo.
  await expect(page.locator('textarea[name="planilla"]')).toHaveValue('850 150\n851 160')

  const animalesEnDestino = await prisma.animal.count({ where: { loteId: loteDestino.id } })
  expect(animalesEnDestino).toBe(0)

  // Corrige solo la chapeta en conflicto, sin retipear el resto.
  await page.fill('textarea[name="planilla"]', '852 150\n851 160')
  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()
  await expect(page.getByText('Se dieron de alta 2 animales.')).toBeVisible()

  const creados = await prisma.animal.findMany({ where: { loteId: loteDestino.id } })
  expect(creados.map((a) => a.chapeta).sort()).toEqual(['851', '852'])
})
