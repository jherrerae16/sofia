import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

const HOY = hoyBogota()

test.afterAll(async () => {
  await prisma.$disconnect()
})

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('un parámetro sin configurar se puede configurar, queda vigente hoy y aparece en el histórico', async ({
  page,
}) => {
  await page.goto('/finca')

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
  await page.goto('/finca')

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
  await page.goto('/finca')

  // Se usa el peso de venta, que la prueba anterior dejó con vigencia futura:
  // ese es justo el estado que dispara el aviso.
  const tarjeta = page.locator('[data-parametro="peso_objetivo_venta_kg"]')
  const enUnMes = sumarDias(HOY, 60)

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

// La prueba del orden entre umbrales se fue con los umbrales: con un solo
// criterio -- la meta de ganancia diaria -- no hay orden que conservar, porque
// un número suelto no puede contradecir a otro.

test('un valor no numérico se rechaza sin guardar nada', async ({ page }) => {
  await page.goto('/finca')

  const tarjeta = page.locator('[data-parametro="hectareas_utiles"]')
  await tarjeta.locator('input[name="valor"]').fill('treinta y cinco')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText(/no es un número/)).toBeVisible()
  // Y el valor que ya regía sigue en pie: un rechazo no borra lo que había.
  await expect(tarjeta.getByTestId('valor-vigente')).toContainText('35,0 ha')
})

test('las hectáreas útiles de la finca se pueden actualizar, con coma decimal, y quedan con vigencia e histórico', async ({
  page,
}) => {
  await page.goto('/finca')

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

test('una clave que no está en la lista de parámetros definidos se rechaza, sin escribir nada', async ({ page }) => {
  await page.goto('/finca')

  const tarjeta = page.locator('[data-parametro="gdp_objetivo"]')
  // El campo `clave` viaja en un input oculto -- nada en el HTML impide que
  // llegue otro valor. `guardarParametroAccion` tiene que rechazarlo contra
  // la lista de parámetros que la pantalla en verdad define, no escribirlo
  // a ciegas. Se pisa el valor DESPUÉS de llenar los otros campos, no antes:
  // es un input controlado (`value={clave}`), y cualquier re-render que
  // dispare `onChange` de los otros campos lo devolvería a "gdp_objetivo".
  await tarjeta.locator('input[name="valor"]').fill('750')
  await tarjeta.locator('input[name="vigenteDesde"]').fill(HOY)
  await tarjeta.locator('input[name="clave"]').evaluate((input: HTMLInputElement) => {
    input.value = 'clave_inventada'
  })
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect(tarjeta.getByText(/no es un parámetro configurable/)).toBeVisible()
  const filas = await prisma.parametro.findMany({ where: { clave: 'clave_inventada' } })
  expect(filas).toHaveLength(0)
})

test('la Finca son los criterios y la copia, y nada más', async ({ page }) => {
  // Los potreros se fueron a su propia pantalla: aquí quedó lo que no cambia
  // todos los días.
  await page.goto('/finca')
  await expect(page.locator('h2')).toHaveText(['Los criterios de la finca', 'Tu copia de todo'])
})

test('el botón de la copia baja un archivo de verdad', async ({ page }) => {
  await page.goto('/finca')
  const descarga = page.waitForEvent('download')
  await page.getByRole('main').getByRole('link', { name: 'Bajar todo a Excel' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/\.xlsx$/)
})
