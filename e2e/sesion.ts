import type { Page } from '@playwright/test'

/**
 * Inicia sesión con el usuario que siembra `e2e/preparar.ts`.
 *
 * Vive en su propio archivo y no en `preparar.ts` porque ese es un script:
 * llama a `main()` en el nivel superior, así que importarlo desde una prueba
 * volvería a sembrar la base a mitad de corrida. Este módulo no tiene efectos
 * al importarse.
 */
export async function entrar(page: Page): Promise<void> {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')
  // El envío pasa por un server action asíncrono: sin esperar a que la
  // redirección a "/" termine, el goto siguiente corta la petición a mitad de
  // camino y la sesión nunca queda establecida.
  await page.waitForURL((url) => url.pathname === '/')
}
