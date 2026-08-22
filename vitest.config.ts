import path from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// `quiet: true` calla la publicidad de terceros que dotenv imprime en cada
// carga (enlaces externos, y con texto que cambia entre corridas): es
// contenido inyectado en la salida de las pruebas que no aporta nada aquí.
config({ path: '.env.test', override: true, quiet: true })

export default defineConfig({
  resolve: {
    // Espeja el alias `@/*` -> `src/*` de tsconfig.json: sin esto, cualquier
    // import real (no de tipo) por alias falla en tiempo de ejecución bajo Vite.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Las pruebas de src/datos comparten una sola base y cada una la limpia en
    // su beforeEach. En paralelo se borrarían los datos entre sí.
    fileParallelism: false,
  },
})
