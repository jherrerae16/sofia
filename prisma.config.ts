import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    // La CLI (migraciones, semilla) va por la conexión directa cuando existe:
    // Neon entrega DATABASE_URL a través de su pooler, y `migrate deploy`
    // necesita bloqueos de sesión que el pooler no sostiene. La aplicación
    // sigue usando DATABASE_URL (src/datos/cliente.ts).
    url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)!,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
})
