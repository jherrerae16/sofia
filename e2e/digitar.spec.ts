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
  // se guardó ningún pesaje.
  //
  // Se cuenta por la fecha del intento y no con un `count()` global: la
  // siembra trae la historia de otro lote (ver `sembrarLoteDeLaPortada` en
  // e2e/preparar.ts), así que un cero global dejó de significar "no se
  // guardó nada" para pasar a significar "no existe ningún pesaje en toda la
  // finca", que es otra afirmación y no la que esta prueba quiere hacer.
  const intentado = new Date(`${sumarDias(HOY, -35)}T00:00:00.000Z`)
  expect(await prisma.pesaje.count({ where: { fecha: intentado } })).toBe(0)
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

test('corregir una fila después de revisar no borra las demás mediciones digitadas', async ({
  page,
}) => {
  // Prueba de F1: antes de este arreglo, React vaciaba los 5 campos de peso
  // en cuanto se enviaba "Revisar" (antes incluso de que volviera la
  // revisión). Corregir SOLO la fila rechazada y volver a revisar mandaba
  // un `FormData` con una sola medición -- las otras 4 nunca sobrevivieron
  // en pantalla para poder reenviarse. `guardarPesaje` terminaba
  // persistiendo 1 medición de las 5 digitadas, con la pantalla diciendo
  // "Pesaje guardado." en verde igual. El arreglo repuebla los campos con
  // lo que se revisó, así que la corrección se hace sobre un formulario
  // completo, no sobre uno vaciado.
  await iniciarSesion(page)
  const fechaDigitada = sumarDias(HOY, -6)

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', fechaDigitada)

  const campos = page.locator('input[name^="peso_"]')
  // Fila 3 (chapeta 003) lleva el dedazo: "0" es un peso imposible
  // (`El peso debe ser mayor que cero.`) y por eso nivel 'rechazo', no solo
  // 'advertencia' -- la fila roja que bloquea guardar, como en el encargo.
  const pesosDigitados = ['162', '167', '0', '158', '156']
  for (let i = 0; i < pesosDigitados.length; i++) {
    await campos.nth(i).fill(pesosDigitados[i])
  }

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(
    page.getByText('Corrige las filas en rojo antes de guardar', { exact: false }),
  ).toBeVisible()

  // F1/F2: tras revisar, la pantalla tiene que seguir mostrando los 5 pesos
  // digitados (y la fecha), no los campos en blanco que React dejó en el
  // DOM al enviar. Si esta comprobación fallara, ya demostraría F2 por sí
  // sola -- pero además es la precondición de la que depende el resto de
  // esta prueba (F1): sin los otros 4 campos repoblados, la corrección de
  // abajo los perdería.
  await expect(page.locator('input[name="fecha"]')).toHaveValue(fechaDigitada)
  for (let i = 0; i < pesosDigitados.length; i++) {
    if (i === 2) continue // la fila rechazada se corrige más abajo
    await expect(campos.nth(i)).toHaveValue(pesosDigitados[i])
  }

  // Corrige EXCLUSIVAMENTE la fila marcada, tal como pide la pantalla.
  await campos.nth(2).fill('148')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar pesaje' })).toBeVisible()

  await page.getByRole('button', { name: 'Guardar pesaje' }).click()
  await expect(page.getByText('Pesaje guardado.')).toBeVisible()

  // No basta con leer la pantalla: se consulta la base directamente para
  // comprobar que las 5 mediciones digitadas se guardaron, no solo la fila
  // que se corrigió al final.
  const animales = await prisma.animal.findMany({
    where: { chapeta: { in: ['001', '002', '003', '004', '005'] } },
  })
  const idPorChapeta = Object.fromEntries(animales.map((a) => [a.chapeta, a.id]))

  const pesaje = await prisma.pesaje.findFirstOrThrow({
    orderBy: { creadoEn: 'desc' },
    include: { mediciones: true },
  })

  expect(pesaje.fecha.toISOString().slice(0, 10)).toBe(fechaDigitada)
  expect(pesaje.mediciones).toHaveLength(5)
  const pesoPorAnimal = new Map(pesaje.mediciones.map((m) => [m.animalId, Number(m.pesoKg)]))
  expect(pesoPorAnimal.get(idPorChapeta['001'])).toBe(162)
  expect(pesoPorAnimal.get(idPorChapeta['002'])).toBe(167)
  expect(pesoPorAnimal.get(idPorChapeta['003'])).toBe(148)
  expect(pesoPorAnimal.get(idPorChapeta['004'])).toBe(158)
  expect(pesoPorAnimal.get(idPorChapeta['005'])).toBe(156)
})

test('cambiar método, responsable o notas después de revisar obliga a revisar de nuevo', async ({
  page,
}) => {
  // Prueba de F3: antes de este arreglo, "Método", "Pesó" y "Notas" no
  // tenían `onChange`, así que cambiarlos después de revisar dejaba el
  // botón diciendo "Guardar pesaje" -- listo para guardar con el valor
  // viejo de `datosRevisados` mientras la pantalla ya mostraba otro.
  await iniciarSesion(page)
  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', sumarDias(HOY, -4))
  await page.locator('input[name^="peso_"]').first().fill('160')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar pesaje' })).toBeVisible()

  await page.selectOption('select[name="metodo"]', 'bascula')
  await expect(page.getByRole('button', { name: 'Revisar antes de guardar' })).toBeVisible()

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar pesaje' })).toBeVisible()

  await page.fill('input[name="responsable"]', 'Amalia')
  await expect(page.getByRole('button', { name: 'Revisar antes de guardar' })).toBeVisible()

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar pesaje' })).toBeVisible()

  await page.fill('input[name="notas"]', 'peso a ojo, se cayó la báscula')
  await expect(page.getByRole('button', { name: 'Revisar antes de guardar' })).toBeVisible()
})
