import { expect, test } from '@playwright/test'
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'
import { prisma } from '../src/datos/cliente'

// Mismo motivo que en las demás pruebas de navegador: fechas relativas a
// hoy, no fijas.
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

test('anota un hecho puntual y aparece en la historia de la finca', async ({ page }) => {
  const lote = await prisma.lote.create({
    data: { nombre: 'Novedades — hecho', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })

  await iniciarSesion(page)
  await page.goto(`/novedades?lote=${lote.id}`)

  // "Hecho puntual" es la opción por omisión: no hace falta tocar los radios.
  await page.fill('input[name="fecha"]', HOY)
  await page.fill('input[name="descripcion"]', 'Se arregló el bebedero del Jobo')
  await page.getByRole('button', { name: 'Anotar' }).click()

  await expect(page.getByText('Se anotó la novedad.')).toBeVisible()
  await expect(page.getByText('Se arregló el bebedero del Jobo')).toBeVisible()

  // Un hecho no es un suministro: no debe aparecer como algo que el lote
  // "recibe ahora mismo".
  await expect(page.getByText('Este lote no tiene ningún suministro vigente.')).toBeVisible()

  const guardado = await prisma.novedad.findFirstOrThrow({ where: { loteId: lote.id } })
  expect(guardado.tipo).toBe('hecho')
  expect(guardado.descripcion).toBe('Se arregló el bebedero del Jobo')
})

test('un suministro queda vigente hasta que se cierra, y la historia muestra el rango', async ({
  page,
}) => {
  const lote = await prisma.lote.create({
    data: { nombre: 'Novedades — suministro', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })

  await iniciarSesion(page)
  await page.goto(`/novedades?lote=${lote.id}`)

  await page.getByLabel('Suministro en curso').check()
  const fechaInicio = sumarDias(HOY, -10)
  await page.fill('input[name="fecha"]', fechaInicio)
  await page.selectOption('select[name="loteId"]', lote.id)
  await page.fill('input[name="descripcion"]', 'Sal a voluntad en el comedero')
  await page.getByRole('button', { name: 'Anotar' }).click()

  await expect(page.getByText('Se anotó la novedad.')).toBeVisible()

  // Pregunta 1: qué recibe el lote ahora mismo. La descripción aparece dos
  // veces en la página (en "vigentes" y otra vez en la historia de abajo);
  // "— desde <fecha>" es un texto exclusivo del panel de vigentes.
  await expect(page.getByText(`— desde ${fechaInicio}`)).toBeVisible()

  // Se cierra el suministro.
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await page.fill('input[name="fechaFin"]', HOY)
  await page.getByRole('button', { name: 'Confirmar cierre' }).click()

  // Ya no está vigente...
  await expect(page.getByText('Este lote no tiene ningún suministro vigente.')).toBeVisible()
  // ...pero sigue en la historia, con su rango completo -- no desaparece.
  await expect(page.getByText(`hasta ${HOY}`)).toBeVisible()

  const guardado = await prisma.novedad.findFirstOrThrow({ where: { loteId: lote.id } })
  expect(guardado.fechaFin?.toISOString().slice(0, 10)).toBe(HOY)
})

test('anular una novedad no la borra: sigue en la historia con su motivo', async ({ page }) => {
  const lote = await prisma.lote.create({
    data: { nombre: 'Novedades — anulación', tipo: 'ceba', fechaApertura: aFechaDb(sumarDias(HOY, -30)) },
  })
  await prisma.novedad.create({
    data: {
      tipo: 'hecho',
      descripcion: 'Se digitó en el lote equivocado por error',
      fecha: aFechaDb(HOY),
      loteId: lote.id,
      registradoPorId: 'siembra',
    },
  })

  await iniciarSesion(page)
  await page.goto(`/novedades?lote=${lote.id}`)

  await page.getByRole('button', { name: 'Anular' }).click()
  await page.fill('textarea[name="motivo"]', 'Chapeta anotada en el lote equivocado')
  await page.getByRole('button', { name: 'Confirmar anulación' }).click()

  await expect(page.getByText(/Anulada el/)).toBeVisible()
  await expect(page.getByText('Motivo: Chapeta anotada en el lote equivocado')).toBeVisible()
  // Sigue visible -- no borrada, no indistinguible de "nunca existió".
  await expect(page.getByText('Se digitó en el lote equivocado por error')).toBeVisible()

  const guardado = await prisma.novedad.findFirstOrThrow({ where: { loteId: lote.id } })
  expect(guardado.anuladoEn).not.toBeNull()
  expect(guardado.motivoAnulacion).toBe('Chapeta anotada en el lote equivocado')
})
