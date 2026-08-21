import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: '.env.test', override: true })

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Las pruebas de src/datos comparten una sola base y cada una la limpia en
    // su beforeEach. En paralelo se borrarían los datos entre sí.
    fileParallelism: false,
  },
})
