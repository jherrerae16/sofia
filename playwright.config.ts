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

// No el 3000: ese casi siempre lo tiene ocupado otro proyecto, y lo usa el
// `npm run dev` de todos los días. `PUERTO_E2E=...` lo cambia si hace falta.
const PUERTO = process.env.PUERTO_E2E ?? '3005'
const BASE = `http://localhost:${PUERTO}`

export default defineConfig({
  testDir: './e2e',
  // Un solo worker: los archivos de prueba comparten `sofia_test` sin
  // aislamiento por prueba (cada uno confía en lo que `e2e/preparar.ts`
  // sembró una vez al principio, no en un `beforeEach` propio). Con más de
  // un worker, Playwright correría dos archivos a la vez sobre la misma
  // base -- por ejemplo `digitar.spec.ts` y `mover-lote.spec.ts` leyendo y
  // escribiendo lotes al mismo tiempo -- y eso sería una carrera de datos,
  // no una prueba.
  workers: 1,
  use: { baseURL: BASE },
  webServer: {
    command: `npm run dev -- -p ${PUERTO}`,
    // Carpeta de build propia, para no chocar con un `npm run dev` abierto.
    env: { NEXT_DIST_DIR: '.next-e2e' },
    url: BASE,
    // Nunca reutilizar un servidor que ya esté corriendo en ese puerto: si
    // alguien dejó un "npm run dev" abierto en otra terminal apuntando a la base
    // real, reusarlo en silencio haría que las pruebas (que borran usuarios,
    // lotes y animales) corrieran contra esa base sin que DATABASE_URL de arriba
    // tuviera ningún efecto. Es más lento arrancar un servidor propio en cada
    // corrida, pero es la única forma de que "contra qué base corre la app" y
    // "contra qué base corre preparar.ts" sean siempre la misma respuesta.
    reuseExistingServer: false,
  },
})
