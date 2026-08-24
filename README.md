# SOFIA

SOFIA es una plataforma web privada para administrar la finca ganadera de
engorde Santa Verónica, en Colombia. La usan el dueño de la finca y quien
lleva la operación en el campo, para digitar pesajes, dar de alta lotes y
animales, mover ganado entre potreros, registrar sanidad y ver cómo va el
engorde contra los umbrales de rendimiento que la finca decide.

No es un proyecto de plantilla ni un producto genérico: cada pantalla asume
la fecha de hoy y el estado vivo de la base de datos, porque el riesgo
principal que existe para resolver es que el dueño deje de digitar pesajes
y no se dé cuenta. Por eso ninguna pantalla (salvo la de inicio de sesión)
se sirve congelada desde el momento del build; todas leen la base en cada
visita.

## Stack

- [Next.js 16](https://nextjs.org) con App Router y TypeScript estricto.
- [Tailwind CSS v4](https://tailwindcss.com).
- [Prisma 7](https://www.prisma.io) sobre PostgreSQL, con el adaptador
  `@prisma/adapter-pg` (Prisma 7 ya no trae el motor Rust integrado).
- [NextAuth v5](https://authjs.dev) con credenciales (correo y clave) para
  los dos usuarios de la finca.
- [Vitest](https://vitest.dev) para las pruebas unitarias y de integración
  contra base de datos, y [Playwright](https://playwright.dev) para las
  pruebas de navegador de punta a punta.

## Cómo levantar el proyecto

Necesitas Node.js y una instancia de PostgreSQL local.

1. Instala las dependencias:

   ```bash
   npm install
   ```

   `npm install` (y `npm ci`) no generan el cliente de Prisma por su cuenta
   -- este proyecto no tiene un `postinstall` que lo haga. Sin ese paso,
   `npx tsc --noEmit` y `npx next build` fallan en `prisma/seed.ts` porque
   el cliente generado no conoce el esquema. Genéralo explícitamente:

   ```bash
   npx prisma generate
   ```

2. Crea el archivo `.env` en la raíz del proyecto con, al menos:

   ```bash
   DATABASE_URL="postgresql://usuario@localhost:5432/sofia"
   AUTH_SECRET="algo-largo-y-secreto"
   # Necesaria en todo entorno donde se corra `next start` (o el equivalente
   # del proveedor de hosting) detrás de un proxy o dominio propio -- no
   # hace falta para `npm run dev`. Sin ella, Auth.js no confía en el
   # encabezado Host y el login queda en bucle sobre
   # /api/auth/callback/credentials sin establecer nunca la sesión: la
   # plataforma queda inaccesible desde el primer despliegue real.
   AUTH_TRUST_HOST=true
   ```

   (Ver `.env.example` para la lista completa, con el porqué de cada
   variable.)

3. Aplica las migraciones y siembra los parámetros de arranque (umbrales de
   rendimiento, objetivo de ganancia diaria, peso objetivo de venta):

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

   La semilla (`prisma/seed.ts`) solo crea la finca y sus parámetros; no crea
   usuarios. Para poder entrar a la aplicación, crea al menos un usuario:

   ```bash
   npx tsx scripts/crear-usuario.ts "Nombre completo" correo@ejemplo.com claveSegura
   ```

4. Levanta el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) y entra con el
   correo y la clave que creaste en el paso anterior.

## Las dos bases de datos

El proyecto usa **dos bases de datos separadas**, nunca una sola:

- **`sofia`** — la base real, con los datos de la finca. Es la que lee y
  escribe la aplicación cuando corre con `.env`.
- **`sofia_test`** — una base exclusiva para pruebas, que se lee de
  `.env.test`. Las pruebas unitarias y las de navegador **borran datos
  agresivamente** en cada corrida (`deleteMany` de animales, lotes,
  pesajes, movimientos, usuarios) para partir de un estado conocido antes
  de cada caso. Correr esas pruebas contra `sofia` se llevaría por delante
  los datos reales de la finca.

  Por eso `vitest.config.ts`, `playwright.config.ts` y `e2e/preparar.ts`
  cargan `.env.test` explícitamente con `override: true`, y
  `e2e/preparar.ts` además valida en tiempo de ejecución que
  `DATABASE_URL` termine en `_test` antes de borrar nada — una segunda capa
  de protección independiente de cuál `.env` se haya cargado.

  Crea `.env.test` igual que `.env`, mismas claves, pero apuntando a
  `sofia_test`:

  ```bash
  DATABASE_URL="postgresql://usuario@localhost:5432/sofia_test"
  AUTH_SECRET="pruebas"
  ```

  Y aplícale las migraciones igual que a la base real:

  ```bash
  DATABASE_URL="postgresql://usuario@localhost:5432/sofia_test" npx prisma migrate deploy
  ```

## Cómo correr las pruebas

Hay tres comandos de verificación, y conviene correrlos en este orden antes
de dar por buena cualquier corrección:

```bash
# Pruebas unitarias y de integración contra sofia_test (Vitest).
npm run test

# Pruebas de navegador de punta a punta (Playwright). Prepara la base de
# pruebas y levanta su propio servidor de desarrollo antes de correr las
# pruebas, así que no hace falta tener `npm run dev` abierto aparte.
npm run test:e2e

# Chequeo de tipos, sin emitir nada.
npx tsc --noEmit
```

`npm run test:watch` deja Vitest corriendo en modo observador mientras se
edita.

Para inspeccionar cómo Next clasifica cada ruta (estática o dinámica) sin
levantar el servidor:

```bash
npx next build
```
