import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { prisma } from '../src/datos/cliente'

// playwright.config.ts ya cargó .env.test con override antes de que este
// archivo se importara, así que `prisma` aquí apunta a la misma base de
// pruebas que usa la app bajo prueba.
test.afterAll(async () => {
  await prisma.$disconnect()
})

// e2e/preparar.ts siembra la fecha de entrada de los animales 30 días atrás
// de hoy (ver el comentario allá) -- estas pruebas usan las mismas fechas
// relativas, no fechas absolutas, para no volver a caducar contra el reloj
// real como ya le pasó a este archivo con `2026-10-01`/`2026-08-01`.
const HOY = hoyBogota()

async function iniciarSesion(page: import('@playwright/test').Page) {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  // El envío pasa por un server action asíncrono: sin esperar a que la
  // redirección a "/" termine, el goto siguiente corta la petición a mitad
  // de camino y la sesión nunca queda establecida.
  await page.waitForURL((url) => url.pathname === '/')
}

test('digitar una tanda muestra la ganancia antes de guardar y atrapa el dedazo', async ({ page }) => {
  await iniciarSesion(page)

  await page.goto('/digitar')
  // Hoy mismo: 30 días después de la entrada sembrada (150 kg), igual que
  // antes de este arreglo, solo que relativa en vez de fija.
  await page.fill('input[name="fecha"]', HOY)

  const campos = page.locator('input[name^="peso_"]')
  await campos.nth(0).fill('174')
  await campos.nth(1).fill('900')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText('800 g/día')).toBeVisible()
  await expect(page.getByText(/Revisa que el peso esté bien digitado/)).toBeVisible()
})

test('un pesaje anterior al ingreso del animal no se guarda', async ({ page }) => {
  await iniciarSesion(page)

  await page.goto('/digitar')
  // 5 días antes de la entrada sembrada (30 días atrás de hoy): siempre
  // anterior al ingreso, sin importar cuándo corra esta prueba.
  await page.fill('input[name="fecha"]', sumarDias(HOY, -35))
  await page.locator('input[name^="peso_"]').first().fill('160')
  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText(/anterior al ingreso/)).toBeVisible()
  await expect(
    page.getByText('Corrige las filas en rojo antes de guardar'),
  ).toBeVisible()

  // No basta con que la pantalla lo diga: si el guardia se rompiera
  // manteniendo el mismo texto de error, esta prueba seguiría en verde sin
  // esto. Se consulta la base directamente para demostrar que en efecto no
  // se guardó ningún pesaje ni ninguna medición.
  expect(await prisma.pesaje.count()).toBe(0)
  expect(await prisma.medicion.count()).toBe(0)
})

test('guardar tras revisar persiste exactamente lo digitado, no lo que el formulario reinició', async ({
  page,
}) => {
  // Prueba de la regresión de E1: React 19 vacía los campos no controlados
  // del <form> en cuanto se envía la revisión (antes incluso de que vuelva
  // la respuesta del servidor). Antes del arreglo, el segundo envío
  // ("Guardar pesaje") reenviaba ese formulario ya vaciado -- fecha por
  // omisión, pesos en blanco -- y `guardarPesaje` creaba un pesaje sin
  // ninguna medición, con la fecha de hoy, mientras la pantalla decía
  // "Pesaje guardado.". No basta con comprobar el aviso en pantalla: hay que
  // consultar la base directamente y comparar contra lo que se digitó.
  await iniciarSesion(page)

  // 10 días atrás de hoy, y no hoy: si el arreglo no sirviera y el segundo
  // envío se reenviara con la fecha por omisión (hoy), esta prueba lo
  // atraparía porque la fecha guardada no coincidiría con la digitada.
  const fechaDigitada = sumarDias(HOY, -10)

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', fechaDigitada)

  const campos = page.locator('input[name^="peso_"]')
  await campos.nth(0).fill('160')
  await campos.nth(1).fill('165')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar pesaje' })).toBeVisible()

  await page.getByRole('button', { name: 'Guardar pesaje' }).click()
  await expect(page.getByText('Pesaje guardado.')).toBeVisible()

  const animales = await prisma.animal.findMany({ where: { chapeta: { in: ['001', '002'] } } })
  const idPorChapeta = Object.fromEntries(animales.map((a) => [a.chapeta, a.id]))

  const pesaje = await prisma.pesaje.findFirstOrThrow({
    orderBy: { creadoEn: 'desc' },
    include: { mediciones: true },
  })

  // La fecha guardada tiene que ser la digitada, no la fecha por omisión del
  // formulario reiniciado -- que sería la de hoy.
  expect(pesaje.fecha.toISOString().slice(0, 10)).toBe(fechaDigitada)
  expect(pesaje.fecha.toISOString().slice(0, 10)).not.toBe(HOY)

  // Y las mediciones tienen que ser las dos que se digitaron y revisaron, no
  // cero mediciones (que es lo que quedaba antes de este arreglo).
  expect(pesaje.mediciones).toHaveLength(2)
  const pesoPorAnimal = new Map(pesaje.mediciones.map((m) => [m.animalId, Number(m.pesoKg)]))
  expect(pesoPorAnimal.get(idPorChapeta['001'])).toBe(160)
  expect(pesoPorAnimal.get(idPorChapeta['002'])).toBe(165)
})
