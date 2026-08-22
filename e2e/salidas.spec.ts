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

// Hallazgo 2.1 del seguimiento: un peso de venta que implica una ganancia
// diaria inverosímil (el dedazo clásico -- 2200 en vez de 220) no puede
// quedar aceptado en silencio. Esta prueba es la que de verdad demuestra que
// la advertencia se ve en pantalla y frena el guardado hasta que alguien la
// confirma -- una prueba unitaria contra `registrarSalida` no alcanza a
// mostrar que la interfaz la expone.
test('un peso de venta con ganancia inverosímil se frena con una advertencia hasta confirmarla', async ({
  page,
}) => {
  const lote = await sembrarLotePropio('Salidas — peso sospechoso', ['931'])

  await iniciarSesion(page)
  await page.goto(`/salidas?lote=${lote.id}`)

  await page.locator('input[name^="sel_"]').check()
  await page.selectOption('select[name="estado"]', 'vendido')
  await page.fill('input[name="fechaSalida"]', HOY)
  // El animal entró con 150 kg hace 30 días: 2200 kg (el mismo dedazo del
  // hallazgo, un dígito de más sobre 220) es una ganancia imposible de creer.
  await page.locator('input[name^="peso_"]').fill('2200')

  await page.getByRole('button', { name: 'Registrar salida' }).click()

  await expect(page.getByText(/Revisa estos pesos de venta/)).toBeVisible()
  await expect(page.getByText(/Ganancia de/)).toBeVisible()

  // Nada se guardó todavía: el animal sigue activo.
  const animales = await prisma.animal.findMany({ where: { loteId: lote.id } })
  expect(animales[0].estado).toBe('activo')

  // El peso digitado y la selección siguen ahí -- no hay que volver a
  // escribir nada, solo confirmar.
  await expect(page.locator('input[name^="peso_"]')).toHaveValue('2200')
  await expect(page.locator('input[name^="sel_"]')).toBeChecked()

  await page.getByRole('checkbox', { name: /Confirmo que el peso está bien/ }).check()
  await page.getByRole('button', { name: 'Registrar salida' }).click()

  await expect(page.getByText('Se registró la salida de 1 animal.')).toBeVisible()
  const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animales[0].id } })
  expect(guardado.estado).toBe('vendido')
})

// Hallazgo 2.4: lo que sale de la finca quedaba invisible -- ni la pantalla
// de Salidas ni la ficha del animal mostraban nada distinto de un animal
// activo. Esta prueba registra una muerte con su motivo y comprueba que
// ambas pantallas lo muestran.
test('un animal muerto se ve distinto de uno activo, en Salidas y en su propia ficha', async ({
  page,
}) => {
  const lote = await sembrarLotePropio('Salidas — visibilidad de la muerte', ['941'])
  const [animal] = await prisma.animal.findMany({ where: { loteId: lote.id } })

  await iniciarSesion(page)
  await page.goto(`/salidas?lote=${lote.id}`)

  await page.locator('input[name^="sel_"]').check()
  await page.selectOption('select[name="estado"]', 'muerto')
  await page.fill('input[name="fechaSalida"]', HOY)
  await page.fill('input[name="motivoSalida"]', 'Neumonía, no respondió al tratamiento')
  await page.getByRole('button', { name: 'Registrar salida' }).click()
  await expect(page.getByText('Se registró la salida de 1 animal.')).toBeVisible()

  // La pantalla de Salidas ahora muestra qué salió de este lote y por qué.
  await expect(page.getByRole('heading', { name: 'Qué salió de este lote' })).toBeVisible()
  await expect(page.getByText('941')).toBeVisible()
  await expect(page.getByText('Neumonía, no respondió al tratamiento')).toBeVisible()

  // Y la ficha del propio animal ya no se ve idéntica a la de uno activo.
  await page.goto(`/animales/${animal.id}`)
  await expect(page.getByText('Muerto', { exact: false })).toBeVisible()
  await expect(page.getByText('Neumonía, no respondió al tratamiento')).toBeVisible()
})
