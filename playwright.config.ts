import { config } from 'dotenv'
import { defineConfig } from '@playwright/test'

// Igual que vitest.config.ts: carga .env.test explícitamente, con override, para
// que Playwright (y el "npm run dev" que levanta más abajo) apunten a la base de
// pruebas sin depender de que quien corra `npx playwright test` recuerde escribir
// el prefijo DATABASE_URL=... en la línea de comandos.
// `quiet: true` calla la publicidad de terceros que dotenv imprime en cada
// carga (enlaces externos, y con texto que cambia entre corridas): es
// contenido inyectado en la salida de las pruebas que no aporta nada aquí.
config({ path: '.env.test', override: true, quiet: true })

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Nunca reutilizar un servidor que ya esté corriendo en el puerto 3000: si
    // alguien dejó un "npm run dev" abierto en otra terminal apuntando a la base
    // real, reusarlo en silencio haría que las pruebas (que borran usuarios,
    // lotes y animales) corrieran contra esa base sin que DATABASE_URL de arriba
    // tuviera ningún efecto. Es más lento arrancar un servidor propio en cada
    // corrida, pero es la única forma de que "contra qué base corre la app" y
    // "contra qué base corre preparar.ts" sean siempre la misma respuesta.
    reuseExistingServer: false,
  },
})
