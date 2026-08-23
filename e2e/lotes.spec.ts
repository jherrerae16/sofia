import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb, aKg } from '../src/datos/conversion'
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

// Defecto 2 del seguimiento del plan 1c: `crearAnimales` solo comprobaba que
// el peso de entrada fuera finito y mayor que cero -- un novillo dado de
// alta con 2200 kg entraba en silencio, y el peso de entrada es la base de
// todos los kilos producidos del ciclo. Esta prueba pasa por la interfaz
// real para demostrar que la advertencia se ve en pantalla, frena el alta
// hasta que se confirme con una sola casilla para toda la tanda. 700 kg es
// inusual para un novillo de entrada pero no imposible -- advierte, no
// rechaza (un peso de verdad imposible, como 2200, ya está cubierto por las
// pruebas unitarias y de integración de `crearAnimales`/`validarPesoEntrada`,
// que sí lo rechazan de plano).
test('un peso de entrada inusual se frena con una advertencia hasta confirmarla, con una sola casilla para toda la tanda', async ({
  page,
}) => {
  const loteDestino = await prisma.lote.create({
    data: { nombre: 'Lotes — peso de entrada sospechoso', tipo: 'ceba', fechaApertura: aFechaDb(HOY) },
  })

  await iniciarSesion(page)
  await page.goto('/lotes')

  await page.selectOption('select[name="loteId"]', loteDestino.id)
  await page.fill('input[name="fechaEntrada"]', HOY)
  // 861 entra con un peso típico; 862 entra inusualmente pesado -- un
  // novillo ya crecido comprado para ceba corta, que existe de verdad.
  await page.fill('textarea[name="planilla"]', '861 220\n862 700')

  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()

  await expect(page.getByText(/Revisa estos pesos de entrada/)).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: '862' })).toBeVisible()

  // Nada se dio de alta todavía.
  expect(await prisma.animal.count({ where: { loteId: loteDestino.id } })).toBe(0)

  // La planilla completa sigue en pantalla, sin necesidad de retipearla.
  await expect(page.locator('textarea[name="planilla"]')).toHaveValue('861 220\n862 700')

  await page.getByRole('checkbox', { name: /Confirmo que los pesos están bien/ }).check()
  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()

  await expect(page.getByText('Se dieron de alta 2 animales.')).toBeVisible()
  const creados = await prisma.animal.findMany({ where: { loteId: loteDestino.id } })
  expect(creados.map((a) => a.chapeta).sort()).toEqual(['861', '862'])
})

test('corregir el peso que disparó la advertencia hace que ya no se exija confirmarla', async ({
  page,
}) => {
  const loteDestino = await prisma.lote.create({
    data: { nombre: 'Lotes — peso corregido', tipo: 'ceba', fechaApertura: aFechaDb(HOY) },
  })

  await iniciarSesion(page)
  await page.goto('/lotes')

  await page.selectOption('select[name="loteId"]', loteDestino.id)
  await page.fill('input[name="fechaEntrada"]', HOY)
  await page.fill('textarea[name="planilla"]', '871 700')

  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()
  await expect(page.getByText(/Revisa estos pesos de entrada/)).toBeVisible()

  // Corrige el peso inusual -- 220, no 700 -- sin marcar ninguna casilla. La
  // advertencia era sobre un dato que ya no existe: no debe seguir
  // exigiendo que se confirme.
  await page.fill('textarea[name="planilla"]', '871 220')
  await page.getByRole('button', { name: 'Dar de alta el lote' }).click()

  await expect(page.getByText('Se dio de alta 1 animal.')).toBeVisible()
  const creado = await prisma.animal.findFirstOrThrow({ where: { loteId: loteDestino.id, chapeta: '871' } })
  expect(aKg(creado.pesoEntradaKg)).toBe(220)
})
