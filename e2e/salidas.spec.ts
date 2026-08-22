import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'
import { prisma } from '../src/datos/cliente'

// Mismo motivo que en digitar.spec.ts y mover-lote.spec.ts: fechas relativas
// a hoy, no fijas.
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

// Igual que mover-lote.spec.ts: crea su propio lote y sus propios animales en
// vez de reutilizar el lote sembrado por e2e/preparar.ts. digitar.spec.ts
// depende de que ese lote compartido conserve sus 5 animales activos; una
// salida real los sacaría de allí y rompería esas pruebas si compartieran
// datos.
async function sembrarLotePropio(nombre: string, chapetas: string[]) {
  const lote = await prisma.lote.create({
    data: { nombre, tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })
  for (const chapeta of chapetas) {
    await prisma.animal.create({
      data: {
        chapeta,
        loteId: lote.id,
        sexo: 'macho',
        raza: 'Brahman',
        fechaEntrada: aFechaDb(sumarDias(HOY, -30)),
        pesoEntradaKg: 150,
      },
    })
  }
  return lote
}

test('vender el lote completo con "seleccionar todos" saca a todos los animales', async ({ page }) => {
  const lote = await sembrarLotePropio('Salidas — venta completa', ['901', '902', '903'])

  await iniciarSesion(page)
  await page.goto(`/salidas?lote=${lote.id}`)

  await page.getByRole('checkbox', { name: 'Seleccionar todos' }).check()
  await page.selectOption('select[name="estado"]', 'vendido')
  await page.fill('input[name="fechaSalida"]', HOY)

  await page.getByRole('button', { name: 'Registrar salida' }).click()
  await expect(page.getByText('Se registró la salida de 3 animales.')).toBeVisible()

  const animales = await prisma.animal.findMany({ where: { loteId: lote.id } })
  expect(animales).toHaveLength(3)
  for (const animal of animales) {
    expect(animal.estado).toBe('vendido')
    expect(animal.fechaSalida?.toISOString().slice(0, 10)).toBe(HOY)
  }
})

test('una fecha de salida anterior a la entrada se rechaza sin perder la selección', async ({
  page,
}) => {
  // La fecha de entrada digitada por el usuario en /salidas no tiene `min`
  // (el `max` es hoy, para evitar fechas futuras) -- así que, a diferencia
  // del motivo obligatorio, esta validación no la bloquea el navegador antes
  // de llegar al servidor. Es la que de verdad ejercita el repoblado tras un
  // rechazo de `registrarSalida`.
  const lote = await sembrarLotePropio('Salidas — fecha inválida', ['911', '912'])

  await iniciarSesion(page)
  await page.goto(`/salidas?lote=${lote.id}`)

  const casillas = page.locator('input[name^="sel_"]')
  await casillas.nth(0).check()
  await page.selectOption('select[name="estado"]', 'vendido')
  await page.fill('input[name="fechaSalida"]', sumarDias(HOY, -35))

  await page.getByRole('button', { name: 'Registrar salida' }).click()

  await expect(page.getByText(/no puede salir antes de su fecha de entrada/)).toBeVisible()
  // La casilla marcada tiene que seguir marcada tras el error -- repoblada
  // desde lo que se envió, no vaciada por React como el resto del formulario.
  await expect(casillas.nth(0)).toBeChecked()
  await expect(casillas.nth(1)).not.toBeChecked()
  await expect(page.locator('select[name="estado"]')).toHaveValue('vendido')
  await expect(page.locator('input[name="fechaSalida"]')).toHaveValue(sumarDias(HOY, -35))

  const animales = await prisma.animal.findMany({ where: { loteId: lote.id } })
  expect(animales.every((a) => a.estado === 'activo')).toBe(true)

  await page.fill('input[name="fechaSalida"]', HOY)
  await page.getByRole('button', { name: 'Registrar salida' }).click()
  await expect(page.getByText('Se registró la salida de 1 animal.')).toBeVisible()
})
