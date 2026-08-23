import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'
import { prisma } from '../src/datos/cliente'

// Mismo motivo que en digitar.spec.ts: fechas relativas a hoy, no fijas.
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

test('mover un lote confirma lo revisado, y cambiar el destino después de revisar obliga a revisar de nuevo', async ({
  page,
}) => {
  // `MoverLoteForm` recibió el mismo arreglo estructural que `TablaPesaje`
  // (F1/F2/F3) pero no tenía prueba propia. Dos lotes y dos potreros, no
  // uno de cada: con una sola opción por selector, el reseteo de React al
  // primer valor de la lista sería indistinguible de una selección real.
  const loteA = await prisma.lote.create({
    data: { nombre: 'Movimiento A', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })
  const loteB = await prisma.lote.create({
    data: { nombre: 'Movimiento B', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })
  const potreroA = await prisma.potrero.create({
    data: { nombre: 'Potrero Prueba A', hectareas: 5, capacidadKg: 5000 },
  })
  const potreroB = await prisma.potrero.create({
    data: { nombre: 'Potrero Prueba B', hectareas: 5, capacidadKg: 5000 },
  })
  void loteA // Solo se usa como la opción "distinta" de la lista; el movimiento real es loteB.

  const fechaMovimiento = sumarDias(HOY, -2)

  await iniciarSesion(page)
  await page.goto('/anotar/mover')

  await page.selectOption('select[name="loteId"]', loteB.id)
  await page.selectOption('select[name="potreroDestinoId"]', potreroB.id)
  await page.fill('input[name="fecha"]', fechaMovimiento)

  await page.getByRole('button', { name: 'Revisar movimiento' }).click()
  await expect(page.getByRole('button', { name: 'Mover lote' })).toBeVisible()

  // F2: tras revisar, la pantalla debe seguir mostrando lo que se revisó
  // (lote B, potrero B, la fecha digitada) -- no el primer lote y el primer
  // potrero de la lista, que es a donde React resetea los `<select>` al
  // enviarse la revisión.
  await expect(page.locator('select[name="loteId"]')).toHaveValue(loteB.id)
  await expect(page.locator('select[name="potreroDestinoId"]')).toHaveValue(potreroB.id)
  await expect(page.locator('input[name="fecha"]')).toHaveValue(fechaMovimiento)

  // F3 (ya cubierto en este formulario, pero vale reconfirmarlo aquí):
  // cambiar el destino después de revisar invalida la revisión vigente.
  await page.selectOption('select[name="potreroDestinoId"]', potreroA.id)
  await expect(page.getByRole('button', { name: 'Revisar movimiento' })).toBeVisible()

  // Vuelve al destino que sí se quiere mover y confirma.
  await page.selectOption('select[name="potreroDestinoId"]', potreroB.id)
  await page.getByRole('button', { name: 'Revisar movimiento' }).click()
  await expect(page.getByRole('button', { name: 'Mover lote' })).toBeVisible()
  await page.getByRole('button', { name: 'Mover lote' }).click()
  await expect(page.getByText('Movimiento registrado.')).toBeVisible()

  // Y contra la base: lo que se movió es lote B a potrero B en la fecha
  // digitada -- no lo que quedó reseteado en el DOM en algún punto de la
  // secuencia de arriba.
  const movimiento = await prisma.movimiento.findFirstOrThrow({
    where: { loteId: loteB.id },
    orderBy: { creadoEn: 'desc' },
  })
  expect(movimiento.potreroDestinoId).toBe(potreroB.id)
  expect(movimiento.fecha.toISOString().slice(0, 10)).toBe(fechaMovimiento)

  const loteActualizado = await prisma.lote.findUniqueOrThrow({ where: { id: loteB.id } })
  expect(loteActualizado.potreroActualId).toBe(potreroB.id)
})
