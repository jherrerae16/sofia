import { expect, test } from '@playwright/test'
import { prisma } from '../src/datos/cliente'
import { entrar } from './sesion'

// Los umbrales, el gdp objetivo y el peso de venta no vienen en la siembra
// compartida a propósito (ver e2e/preparar.ts): configuracion.spec afirma
// sobre varios de ellos que están "sin configurar todavía". Ganado sí los
// necesita -- `leerUmbrales` lanza cuando no hay ninguno vigente --, así que
// este archivo los siembra y los recoge, sin tocar los de nadie más.
const MIOS = ['umbral_excelente', 'umbral_bueno', 'umbral_normal', 'umbral_bajo', 'gdp_objetivo', 'peso_objetivo_venta_kg']

test.beforeAll(async () => {
  await prisma.parametro.deleteMany({ where: { clave: { in: MIOS } } })
  for (const [clave, valor] of Object.entries({
    umbral_excelente: '900',
    umbral_bueno: '750',
    umbral_normal: '600',
    umbral_bajo: '400',
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

test('sin umbrales configurados la portada no se cae: dice qué falta y sigue mostrando lo demás', async ({
  page,
}) => {
  await prisma.parametro.deleteMany({ where: { clave: { startsWith: 'umbral_' } } })
  try {
    await irAlLoteConHistoria(page)
    await expect(page.getByTestId('cinta')).toContainText('Novillos')
    const aviso = page.getByTestId('falta-configurar')
    // Nombra el parámetro que falta y promete que lo demás sigue en pie: un
    // "algo salió mal" no le dice al dueño qué tiene que ir a arreglar.
    await expect(aviso).toContainText('umbral')
    await expect(aviso).toContainText('el resto de la pantalla sigue en pie')
  } finally {
    for (const [clave, valor] of Object.entries({
      umbral_excelente: '900',
      umbral_bueno: '750',
      umbral_normal: '600',
      umbral_bajo: '400',
    })) {
      await prisma.parametro.create({
        data: { clave, valor, vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
      })
    }
  }
})
