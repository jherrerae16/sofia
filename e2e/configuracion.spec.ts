import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { prisma } from '../src/datos/cliente'

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

test('un parámetro sin configurar se puede configurar, queda vigente hoy y aparece en el histórico', async ({
  page,
}) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  const tarjeta = page.locator('[data-parametro="gdp_objetivo"]')
  await expect(tarjeta.getByText('Sin configurar todavía.')).toBeVisible()

  await tarjeta.locator('input[name="valor"]').fill('750')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText('Guardado.')).toBeVisible()
  const valorVigente = tarjeta.getByTestId('valor-vigente')
  await expect(valorVigente).toContainText(HOY)
  await expect(valorVigente).toContainText('750 g/día')

  // Un segundo cambio, con otra fecha, tiene que verse en el histórico sin
  // que el primer valor desaparezca.
  const mañana = sumarDias(HOY, 1)
  await tarjeta.locator('input[name="valor"]').fill('800')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(mañana)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()
  await expect(tarjeta.getByText('Guardado.')).toBeVisible()

  await tarjeta.getByText(/Ver histórico/).click()
  await expect(tarjeta.getByRole('row', { name: new RegExp(HOY) })).toContainText('750 g/día')
  await expect(tarjeta.getByRole('row', { name: new RegExp(mañana) })).toContainText('800 g/día')
})

test('una vigencia futura como único valor avisa antes de guardar, y confirmar guarda igual', async ({ page }) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  const tarjeta = page.locator('[data-parametro="peso_objetivo_venta_kg"]')
  const enUnMes = sumarDias(HOY, 30)

  await tarjeta.locator('input[name="valor"]').fill('320')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(enUnMes)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  // Es la única vigencia que tendría esta clave: avisa, no guarda todavía.
  await expect(tarjeta.getByText(/se queda sin ningún valor configurado hoy/)).toBeVisible()
  await expect(tarjeta.getByText('Sin configurar todavía.')).toBeVisible()

  await tarjeta.getByRole('button', { name: 'Guardar de todas formas' }).click()
  await expect(tarjeta.getByText('Guardado.')).toBeVisible()
  // Guardado, pero sigue sin vigente HOY -- la fecha todavía no llegó.
  await expect(tarjeta.getByText('Sin configurar todavía.')).toBeVisible()
})

test('editar el valor después del aviso obliga a revisarlo de nuevo, no deja confirmar a ciegas', async ({
  page,
}) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  const tarjeta = page.locator('[data-parametro="umbral_bajo"]')
  const enUnMes = sumarDias(HOY, 30)

  await tarjeta.locator('input[name="valor"]').fill('400')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(enUnMes)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()
  await expect(tarjeta.getByRole('button', { name: 'Guardar de todas formas' })).toBeVisible()

  // Tocar el valor invalida la confirmación pendiente: el botón vuelve a
  // pedir "Guardar" (una revisión nueva), no permite confirmar a ciegas
  // sobre un número distinto del que se avisó.
  await tarjeta.locator('input[name="valor"]').fill('401')
  await expect(tarjeta.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible()
})

test('un umbral que rompe el orden se rechaza con un mensaje claro, y no queda guardado', async ({ page }) => {
  await prisma.parametro.create({
    data: { clave: 'umbral_excelente', valor: '900', vigenteDesde: new Date(`${HOY}T00:00:00.000Z`) },
  })
  await prisma.parametro.create({
    data: { clave: 'umbral_bueno', valor: '750', vigenteDesde: new Date(`${HOY}T00:00:00.000Z`) },
  })

  await iniciarSesion(page)
  await page.goto('/configuracion')

  const tarjeta = page.locator('[data-parametro="umbral_bueno"]')
  await tarjeta.locator('input[name="valor"]').fill('950')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText(/tiene que ser mayor que/)).toBeVisible()
  await expect(tarjeta.getByTestId('valor-vigente')).toContainText('750 g/día')
})

test('un valor no numérico se rechaza sin guardar nada', async ({ page }) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  const tarjeta = page.locator('[data-parametro="umbral_normal"]')
  await tarjeta.locator('input[name="valor"]').fill('seiscientos')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText(/no es un número/)).toBeVisible()
  await expect(tarjeta.getByText('Sin configurar todavía.')).toBeVisible()
})

test('las hectáreas útiles de la finca se pueden actualizar, con coma decimal, y quedan con vigencia e histórico', async ({
  page,
}) => {
  await iniciarSesion(page)
  await page.goto('/configuracion')

  // Sembrada por e2e/preparar.ts con vigencia del año 2000: tiene que
  // aparecer como el resto de los parámetros, con formato colombiano.
  const tarjeta = page.locator('[data-parametro="hectareas_utiles"]')
  await expect(tarjeta.getByTestId('valor-vigente')).toContainText('35,0 ha')

  await tarjeta.locator('input[name="valor"]').fill('40,5')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText('Guardado.')).toBeVisible()
  await expect(tarjeta.getByTestId('valor-vigente')).toContainText(HOY)
  await expect(tarjeta.getByTestId('valor-vigente')).toContainText('40,5 ha')

  // Igual que los otros seis parámetros: el valor anterior no desaparece,
  // queda en el histórico -- es justo lo que Finca.hectareasUtiles no podía
  // ofrecer antes de este cambio.
  await tarjeta.getByText(/Ver histórico/).click()
  await expect(tarjeta.getByRole('row', { name: '2000-01-01' })).toContainText('35,0 ha')
})
