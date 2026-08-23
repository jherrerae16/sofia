import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'
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

test('la pantalla de lotes muestra el tipo en español, no el valor crudo del enum', async ({ page }) => {
  await prisma.lote.create({
    data: { nombre: 'Etiquetas — lote de leche', tipo: 'leche', fechaApertura: aFechaDb(sumarDias(HOY, -10)) },
  })

  await iniciarSesion(page)
  await page.goto('/lotes')

  const fila = page.getByRole('row', { name: /Etiquetas — lote de leche/ })
  await expect(fila.getByRole('cell', { name: 'Leche', exact: true })).toBeVisible()
})

test('el selector de método de pesaje muestra las tres opciones con mayúscula inicial, derivadas del mapa central', async ({
  page,
}) => {
  await iniciarSesion(page)
  await page.goto('/digitar')

  const opciones = page.locator('select[name="metodo"] option')
  // Las tres, ni una de más ni de menos: si el esquema agregara un cuarto
  // método (`MetodoPesaje`), etiquetas.test.ts obligaría a agregarlo también
  // a `ETIQUETA_METODO_PESAJE`, y este selector -- que ya no las escribe a
  // mano -- lo heredaría solo.
  await expect(opciones).toHaveText(['Cinta bovinométrica', 'Báscula', 'Estimación'])
})

test('la ficha del animal muestra el tipo de evento sanitario con etiqueta legible, no el valor crudo', async ({
  page,
}) => {
  const usuario = await prisma.usuario.findFirstOrThrow()
  const lote = await prisma.lote.findFirstOrThrow()
  const animal = await prisma.animal.create({
    data: {
      chapeta: 'etq-001',
      loteId: lote.id,
      sexo: 'macho',
      fechaEntrada: aFechaDb(sumarDias(HOY, -30)),
      pesoEntradaKg: 150,
    },
  })
  await prisma.eventoSanitario.create({
    data: {
      tipo: 'desparasitacion',
      fecha: aFechaDb(HOY),
      producto: 'Ivermectina',
      responsable: 'Joseph',
      animalId: animal.id,
      registradoPorId: usuario.id,
    },
  })

  await iniciarSesion(page)
  await page.goto(`/animales/${animal.id}`)

  await expect(page.getByText('Desparasitación')).toBeVisible()
  // El valor crudo, sin tilde, no debe quedar visible en ningún lado.
  await expect(page.getByText('desparasitacion', { exact: true })).toHaveCount(0)
})
