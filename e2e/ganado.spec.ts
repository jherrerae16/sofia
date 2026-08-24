import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

// Los umbrales, el gdp objetivo y el peso de venta no vienen en la siembra
// compartida a propósito (ver e2e/preparar.ts): configuracion.spec afirma
// sobre varios de ellos que están "sin configurar todavía". Ganado sí los
// necesita -- `leerUmbrales` lanza cuando no hay ninguno vigente --, así que
// este archivo los siembra y los recoge, sin tocar los de nadie más.
const MIOS = ['gdp_objetivo', 'peso_objetivo_venta_kg']

test.beforeAll(async () => {
  await prisma.parametro.deleteMany({ where: { clave: { in: MIOS } } })
  for (const [clave, valor] of Object.entries({
    gdp_objetivo: '750',
    peso_objetivo_venta_kg: '320',
  })) {
    await prisma.parametro.create({
      data: { clave, valor, vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })
  }
})

test.afterAll(async () => {
  await prisma.parametro.deleteMany({ where: { clave: { in: MIOS } } })
  await prisma.$disconnect()
})

async function irAlLoteConHistoria(page: import('@playwright/test').Page) {
  const lote = await prisma.lote.findFirstOrThrow({ where: { nombre: 'Ceba 02' } })
  await page.goto(`/?lote=${lote.id}`)
}

test.beforeEach(async ({ page }) => {
  await entrar(page)
  await irAlLoteConHistoria(page)
})

test('el titular dice cómo va el lote y cuántos están quedados, con datos reales', async ({ page }) => {
  const titular = page.locator('h1')
  await expect(titular).toContainText('Ceba 02')
  await expect(titular).toContainText('g/día')
  await expect(titular).toContainText('quedados')
  // Nada de plantilla a medio llenar.
  await expect(titular).not.toContainText('undefined')
  await expect(titular).not.toContainText('NaN')
  await expect(titular).not.toContainText('—')
})

test('la bajada dice dónde están, hace cuánto se pesó y cuál es el objetivo', async ({ page }) => {
  const bajada = page.getByTestId('bajada')
  await expect(bajada).toContainText('La Loma')
  await expect(bajada).toContainText('Pesaste hace 20 días')
  await expect(bajada).toContainText('750 g/día')
})

test('la cinta trae las cuatro cifras del lote, ninguna vacía', async ({ page }) => {
  const cinta = page.getByTestId('cinta')
  for (const rotulo of ['Novillos', 'Peso vivo', 'Producido en el ciclo', 'Carga']) {
    await expect(cinta).toContainText(rotulo)
  }
  await expect(cinta).toContainText('14')
  await expect(cinta).not.toContainText('NaN')
  await expect(cinta).not.toContainText('—')
})

test('la desparasitación vencida aparece como aviso con su enlace para anotarla', async ({ page }) => {
  const avisos = page.getByTestId('avisos')
  await expect(avisos).toContainText('Ivermectina 1%')
  await expect(avisos.getByRole('link', { name: 'Anotarla' })).toHaveAttribute('href', '/anotar/sanidad')
})

test('sin gdp objetivo configurado no se escribe la frase del objetivo a medias', async ({ page }) => {
  await prisma.parametro.deleteMany({ where: { clave: 'gdp_objetivo' } })
  try {
    await irAlLoteConHistoria(page)
    const bajada = page.getByTestId('bajada')
    await expect(bajada).toContainText('Pesaste hace 20 días')
    await expect(bajada).not.toContainText('objetivo')
  } finally {
    await prisma.parametro.create({
      data: { clave: 'gdp_objetivo', valor: '750', vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })
  }
})

test('sin meta de ganancia fijada nadie sale marcado, pero la portada sigue en pie', async ({
  page,
}) => {
  await prisma.parametro.deleteMany({ where: { clave: 'gdp_objetivo' } })
  try {
    await irAlLoteConHistoria(page)
    // Decir que un animal "va quedado" sin una meta contra la cual medirlo
    // sería una opinión de la plataforma, no del dueño. Así que no se dice --
    // y todo lo demás se sigue mostrando igual.
    await expect(page.getByTestId('cinta')).toContainText('Novillos')
    await expect(page.getByTestId('tarja')).toHaveCount(14)
    await expect(page.getByRole('button', { name: /^Quedados/ })).toContainText('0')
  } finally {
    await prisma.parametro.create({
      data: { clave: 'gdp_objetivo', valor: '750', vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })
  }
})

test('la gráfica dibuja un punto por pesaje más el de la entrada, y la trayectoria objetivo', async ({
  page,
}) => {
  const grafica = page.getByRole('img', { name: /peso promedio del lote/i })
  await expect(grafica).toBeVisible()
  // La entrada más las dos tandas sembradas.
  await expect(grafica.locator('circle')).toHaveCount(3)
  await expect(grafica.locator('path.meta')).toHaveCount(1)
})

test('el pie de la gráfica avisa que la última tanda no alcanzó a todos', async ({ page }) => {
  // Es la razón de ser de la gráfica: un promedio calculado sobre diez de
  // catorce se lee como si fueran los catorce si nadie lo dice.
  await expect(page.locator('figcaption')).toContainText('cubrió 10 de 14')
})

test('sin gdp objetivo la gráfica se dibuja sin trayectoria, no vacía', async ({ page }) => {
  await prisma.parametro.deleteMany({ where: { clave: 'gdp_objetivo' } })
  try {
    await irAlLoteConHistoria(page)
    const grafica = page.getByRole('img', { name: /peso promedio del lote/i })
    await expect(grafica).toBeVisible()
    await expect(grafica.locator('circle')).toHaveCount(3)
    await expect(grafica.locator('path.meta')).toHaveCount(0)
  } finally {
    await prisma.parametro.create({
      data: { clave: 'gdp_objetivo', valor: '750', vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })
  }
})

test('la rejilla trae una tarja por animal activo del lote', async ({ page }) => {
  await expect(page.getByTestId('tarja')).toHaveCount(14)
})

test('el chip de quedados deja solo a los quedados, y la cuenta cuadra', async ({ page }) => {
  const chip = page.getByRole('button', { name: /^Quedados/ })
  const cuenta = Number((await chip.innerText()).replace(/\D/g, ''))
  expect(cuenta).toBeGreaterThan(0)

  await chip.click()
  await expect(page.getByTestId('tarja')).toHaveCount(cuenta)
})

test('el chip de sin pesar señala a los que no entraron en la última tanda', async ({ page }) => {
  // La siembra pesó a diez de los catorce en la última tanda.
  const chip = page.getByRole('button', { name: /^Sin pesar/ })
  await expect(chip).toContainText('4')
  await chip.click()
  await expect(page.getByTestId('tarja')).toHaveCount(4)
})

test('el filtro Desde cambia el periodo contra el que se mide, y queda en la URL', async ({ page }) => {
  await page.getByLabel('Desde').selectOption('dias_30')
  await expect(page).toHaveURL(/desde=dias_30/)
  // Y no se lleva por delante el lote que se estaba mirando.
  await expect(page).toHaveURL(/lote=/)
})

test('la vista Tabla trae las columnas que estaban en Cómo vamos', async ({ page }) => {
  await page.getByRole('button', { name: 'Tabla' }).click()
  const encabezados = page.locator('table thead th')
  await expect(encabezados).toContainText(['Chapeta'])
  await expect(encabezados).toContainText(['Kg ganados'])
  await expect(encabezados).toContainText(['Días en finca'])
})

test('buscar una chapeta deja solo esa', async ({ page }) => {
  await page.getByPlaceholder('Buscar chapeta').fill('001')
  await expect(page.getByTestId('tarja')).toHaveCount(1)
  await expect(page.getByTestId('tarja')).toContainText('001')
})

test('cada tarja lleva a la ficha de su animal', async ({ page }) => {
  await page.getByTestId('tarja').first().click()
  await expect(page).toHaveURL(/\/animales\//)
})

test('sin peso de venta configurado no se inventa el chip de listos', async ({ page }) => {
  await prisma.parametro.deleteMany({ where: { clave: 'peso_objetivo_venta_kg' } })
  try {
    await irAlLoteConHistoria(page)
    await expect(page.getByRole('button', { name: /^Listos/ })).toHaveCount(0)
    // Pero la lista sigue ahí: falta un criterio, no los animales.
    await expect(page.getByTestId('tarja')).toHaveCount(14)
  } finally {
    await prisma.parametro.create({
      data: {
        clave: 'peso_objetivo_venta_kg',
        valor: '320',
        vigenteDesde: new Date('2000-01-01T00:00:00.000Z'),
      },
    })
  }
})

test('un animal quedado se ve como alerta, no como un punto más', async ({ page }) => {
  const quedados = page.getByTestId('tarja').filter({ hasText: 'Quedado' })
  await expect(quedados.first()).toBeVisible()

  // La distinción tiene que estar en la estructura, no solo en un color: un
  // punto de seis píxeles en café contra otro punto de seis píxeles en café es
  // lo mismo que no marcar nada.
  const primera = quedados.first()
  await expect(primera).toHaveAttribute('data-estado', 'quedado')
  await expect(primera.getByText('Quedado')).toBeVisible()

  // Y ninguna tarjeta que no esté quedada lleva la etiqueta: si la llevaran
  // todas, marcar dejaría de significar algo.
  const sinAlerta = page.getByTestId('tarja').filter({ hasNotText: 'Quedado' })
  await expect(sinAlerta.first()).toBeVisible()
  for (const tarja of await sinAlerta.all()) {
    expect(await tarja.getAttribute('data-estado')).not.toBe('quedado')
  }
})

test('el chip, el titular y las tarjetas cuentan lo mismo', async ({ page }) => {
  // Tres sitios, una sola verdad. No se fija un número: cuántos van quedados
  // depende de la meta configurada, y esa la cambia el dueño cuando quiera.
  // Lo que no puede pasar es que los tres no cuadren.
  const chip = await page.getByRole('button', { name: /^Quedados/ }).innerText()
  const cuantos = Number(chip.replace(/\D/g, ''))
  expect(cuantos).toBeGreaterThan(0)

  await expect(page.getByTestId('tarja').filter({ hasText: 'Quedado' })).toHaveCount(cuantos)
  await expect(page.locator('h1')).toContainText(`${cuantos} novillos están quedados`)
})
