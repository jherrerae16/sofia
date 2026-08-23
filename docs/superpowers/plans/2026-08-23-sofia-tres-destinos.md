# SOFÍA — Plan 2: Tres destinos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las nueve pantallas actuales por tres destinos —Ganado, Anotar y Finca— con el sistema visual v3 (verde monte sobre crema), sin perder ninguna función que hoy existe, y construir la pantalla de sanidad que nunca se hizo.

**Architecture:** Ninguna regla de negocio cambia. Todo `src/calc/` queda intacto y `src/datos/` solo crece con dos lecturas nuevas (la serie de peso del lote y la línea de tiempo del animal). Lo que se reescribe es `src/app/`: nueve rutas se vuelven tres, los formularios que ya existen se mudan bajo `/anotar/[modo]` conservando sus acciones de servidor, y el sistema visual pasa de utilidades de Tailwind sueltas a un puñado de componentes en `src/ui/` que hablan el vocabulario del mockup (marco, titular, cinta, aviso, tarja, chip).

**Tech Stack:** Next.js 16 (App Router), TypeScript estricto, Tailwind CSS v4, Prisma con PostgreSQL, Vitest, Playwright, Auth.js v5.

**Mockup aprobado:** `docs/diseno/v2/{ganado,anotar,sanidad,animal,finca}.html` con `docs/diseno/v2/base.css`. Cuando este plan y el mockup no coincidan, manda el mockup — salvo donde este plan diga explícitamente lo contrario y explique por qué.

## Global Constraints

- **Nada hardcodeado salvo las fórmulas.** Umbrales, gdp objetivo, hectáreas útiles, capacidades y tipos de lote se leen de la base con `leerUmbrales`, `leerGdpObjetivo` y `leerParametro`. Ningún número de los mockups (750 g/día, 320 kg, 400 g/día, 35 ha) puede quedar escrito en el código: en los mockups son datos de muestra.
- **Los módulos de `src/calc/` no importan Prisma, React ni Next.** Este plan no los toca.
- **Las fechas viajan como `FechaISO` (`'YYYY-MM-DD'`).** La conversión desde y hacia `Date` ocurre solo en `src/datos/`.
- **El nombre completo aparece una sola vez.** «SOFÍA — por Sofanor Echeverría.» va al pie de la pantalla Ganado y de ninguna otra. Los mockups lo repiten en las cinco páginas porque cada archivo es independiente; en la plataforma sería ruido. Va en `src/app/page.tsx`, **no** en `layout.tsx`.
- **Español colombiano en toda la interfaz.** Ningún valor crudo de enum sale a pantalla: se pasa por `src/ui/etiquetas.ts`.
- **Números con formato colombiano.** Coma decimal y punto de miles, vía `src/ui/formato.ts`. Toda cifra lleva `font-variant-numeric: tabular-nums` (la clase `.cifra`).
- **`formatearKg` y `formatearGdp` YA traen la unidad pegada** (`'278,0 kg'`, `'692 g/día'`). No escribir la unidad otra vez al lado, ni pasársela aparte a `<Cinta>`. Cuando la cinta necesita la unidad en chico y aparte —que es como la dibuja el mockup—, usar `separarUnidad` (Tarea 3), no concatenar a mano.
- **Solo dos cosas llevan color:** lo que va mal (`--color-barro`, `#C25A2E`) y lo que va bien (`--color-monte`, `#0F4430`). Todo lo demás es tinta sobre crema. El par viejo (`#1B5E3F` verde contra `#A63D40` rojo) daba ΔE 1,7 con daltonismo protán —indistinguible para ~8% de los hombres—; el par nuevo da ΔE 17,0. No reintroducir los colores viejos.
- **Ninguna función se pierde.** Cada cosa que hoy se puede hacer en las nueve pantallas tiene que poder hacerse después. La Tarea 11 lo verifica pantalla por pantalla contra la tabla de equivalencias.
- **Cobertura:** cada pantalla nueva llega con una prueba de navegador que la recorre. Cada función nueva de `src/datos/` llega con pruebas de Vitest contra `sofia_test`.

## Mapa de rutas

| Hoy | Después |
|---|---|
| `/` (Hoy) | `/` **es** Ganado. La portada y la lista son la misma pantalla. |
| `/como-vamos` | `/` — el selector de periodo es el filtro «Desde»; las columnas de kg y días son la vista «Tabla». |
| `/digitar` | `/anotar/pesos` |
| `/salidas` | `/anotar/salida` |
| `/novedades` | `/anotar/novedad` |
| `/potreros` (mover lote) | `/anotar/mover` |
| `/lotes` (alta de animales) | `/anotar/entrada` |
| — (no existía) | `/anotar/sanidad` |
| `/potreros` (ver y crear potreros) | `/finca` |
| `/configuracion` | `/finca` |
| `/exportar` | `/exportar` (no cambia; el botón vive en `/finca`) |
| `/animales/[id]` | `/animales/[id]` (rediseñada) |
| `/entrar` | `/entrar` (solo se le aplica el sistema visual) |

Las rutas viejas no se dejan colgando: cada una queda como una redirección permanente a su destino nuevo (Tarea 11). El dueño tiene enlaces guardados en el navegador.

## Estructura de archivos

**Sistema visual (Tarea 1)**
- `src/app/globals.css` — tokens del sistema v3 y las clases que Tailwind no puede expresar cómodamente (`.cinta`, `.tarja`, `.rejilla`, `.modos`).
- `src/app/layout.tsx` — el caparazón: fuentes Archivo, encabezado de tres destinos, quién está adentro.
- `src/ui/Marco.tsx` — el ancho máximo y el respiro de todas las pantallas.
- `src/ui/Titular.tsx` — el titular en prosa con sus avisos de una línea.
- `src/ui/Cinta.tsx` — la fila de cuatro cifras.
- `src/ui/Boton.tsx` — `.btn` y `.btn.fantasma` como componente.

**Lecturas nuevas (Tareas 2 y 9)**
- `src/datos/serie.ts` — `serieDePesoPromedio`, la curva del lote contra la trayectoria objetivo.
- `src/datos/linea-de-tiempo.ts` — `lineaDeTiempoDeAnimal`, todo lo que le ha pasado a un animal en un solo orden.

**Ganado (Tareas 3 a 5)**
- `src/app/page.tsx` — la pantalla entera, del servidor.
- `src/app/GraficaLote.tsx` — el SVG de la curva.
- `src/app/FiltrosGanado.tsx` — los filtros y los chips (cliente; escriben en la URL).
- `src/app/RejillaGanado.tsx` — la rejilla de tarjas y la vista de tabla.

**Anotar (Tareas 6 a 8)**
- `src/app/anotar/layout.tsx` — el titular y la cinta de modos, compartidos por los seis.
- `src/app/anotar/page.tsx` — redirige a `/anotar/pesos`.
- `src/app/anotar/pesos/`, `salida/`, `novedad/`, `mover/`, `entrada/`, `sanidad/` — una carpeta por modo, cada una con su `page.tsx`, su formulario de cliente y su `acciones.ts`.

**Finca (Tarea 10)**
- `src/app/finca/page.tsx` — potreros, criterios y la copia de todo.
- `src/app/finca/TarjetaPotrero.tsx`, `src/app/finca/FilaCriterio.tsx`.

**Ficha del animal (Tarea 9)**
- `src/app/animales/[id]/page.tsx` — reescrita como línea de tiempo.

**Se borran (Tarea 11)**
`src/app/como-vamos/`, `src/app/digitar/`, `src/app/salidas/`, `src/app/novedades/`, `src/app/lotes/`, `src/app/potreros/`, `src/app/configuracion/` — sus formularios y acciones ya se mudaron; lo que queda son las páginas viejas.

---

### Task 1: El caparazón de tres destinos

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/ui/Marco.tsx`
- Create: `src/ui/Boton.tsx`
- Test: `e2e/caparazon.spec.ts`

**Interfaces:**
- Produces: `Marco({ children }: { children: React.ReactNode })` — envuelve el contenido en `<div class="marco">`.
- Produces: `Boton({ href, children, fantasma }: { href?: string; children: React.ReactNode; fantasma?: boolean })` — si trae `href` renderiza un `<Link>`, si no, un `<button>`.
- Produces: los tokens CSS `--color-crema`, `--color-crema-2`, `--color-crema-3`, `--color-monte`, `--color-monte-2`, `--color-tierra`, `--color-barro`, `--color-carbon`, `--color-carbon-2`, `--color-carbon-3`, `--color-borde`, `--color-borde-2`, usables como `bg-monte`, `text-carbon-3`, `border-borde`.

- [x] **Step 1: Escribir la prueba de navegador que falla**

Crear `e2e/caparazon.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { entrar } from './preparar'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('el encabezado ofrece exactamente tres destinos', async ({ page }) => {
  await page.goto('/')
  const destinos = page.locator('header nav a')
  await expect(destinos).toHaveText(['Ganado', 'Anotar', 'Finca'])
})

test('el destino en el que estás queda marcado, y solo ese', async ({ page }) => {
  await page.goto('/anotar/pesos')
  await expect(page.locator('header nav a[aria-current="page"]')).toHaveText(['Anotar'])
})

test('el nombre completo aparece una sola vez, al pie de Ganado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(1)

  await page.goto('/finca')
  await expect(page.getByText('SOFÍA — por Sofanor Echeverría.')).toHaveCount(0)
})
```

Revisar antes `e2e/preparar.ts`: si no exporta un ayudante `entrar(page)` que haga el login, extraerlo de la prueba que ya lo hace (`e2e/digitar.spec.ts` lo tiene inline) y exportarlo desde `preparar.ts`. Todas las pruebas nuevas de este plan lo usan.

- [x] **Step 2: Correr la prueba y verla fallar**

Run: `npx playwright test e2e/caparazon.spec.ts`
Expected: FAIL — el encabezado todavía trae ocho enlaces («Hoy», «Cómo vamos», …), y `/anotar/pesos` y `/finca` devuelven 404.

- [x] **Step 3: Reescribir los tokens del sistema visual**

`src/app/globals.css`:

```css
@import 'tailwindcss';

/* Sistema visual v3 — verde monte sobre crema.
   Solo dos cosas llevan color: lo que va mal (barro) y lo que va bien
   (monte). Todo lo demás es tinta. El par viejo (#1B5E3F contra #A63D40)
   daba ΔE 1,7 con daltonismo protán -- indistinguible para ~8% de los
   hombres. Este par da ΔE 17,0. */
@theme {
  --color-crema: #f7f4ec;
  --color-crema-2: #efeae0;
  --color-crema-3: #e6e0d4;
  --color-monte: #0f4430;
  --color-monte-2: #2e6b4c;
  --color-pasto-claro: #a8d5ba;
  --color-tierra: #8b5e3c;
  --color-barro: #c25a2e;
  --color-carbon: #1f1c17;
  --color-carbon-2: #5c554a;
  --color-carbon-3: #8b8378;
  --color-borde: rgba(31, 28, 23, 0.14);
  --color-borde-2: rgba(31, 28, 23, 0.28);

  /* Alias de transición: las siete pantallas viejas todavía los usan y se
     borran en la Tarea 11. No usarlos en código nuevo. */
  --color-pasto: #0f4430;
  --color-pasto-medio: #2e6b4c;
  --color-ambar: #c25a2e;
  --color-rojo-tierra: #c25a2e;
}

@theme {
  --font-sans: var(--font-interfaz), system-ui, sans-serif;
  --font-estrecha: var(--font-estrecha), system-ui, sans-serif;
  /* La plataforma ya no usa serif. El alias queda para que las pantallas
     viejas no se rompan antes de que la Tarea 11 las borre. */
  --font-serif: var(--font-interfaz), system-ui, sans-serif;
}

body {
  background-color: var(--color-crema);
  color: var(--color-carbon);
  font-family: var(--font-sans);
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
}

/* Obligatorio: sin cifras tabulares una tabla de 56 animales es ilegible. */
.cifra {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

/* Rótulo pequeño en versalitas: se repite en la cinta, en los encabezados de
   sección y en las etiquetas de los campos. Es más corto como clase que como
   seis utilidades repetidas en veinte lugares. */
.rotulo {
  font-family: var(--font-estrecha);
  font-weight: 600;
  font-size: 10.5px;
  line-height: 1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-carbon-3);
}
```

- [x] **Step 4: Reescribir el caparazón**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Archivo, Archivo_Narrow } from 'next/font/google'
import './globals.css'
import { auth } from '@/auth'
import { obtenerFinca } from '@/datos/finca'
import { Navegacion } from '@/ui/Navegacion'

const interfaz = Archivo({ subsets: ['latin'], weight: ['500', '600', '800'], variable: '--font-interfaz' })
const estrecha = Archivo_Narrow({ subsets: ['latin'], weight: ['600'], variable: '--font-estrecha' })

export const metadata: Metadata = {
  title: 'SOFÍA',
  description: 'Control integral de la finca Santa Verónica',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Quién está adentro y en qué finca: el mockup lo pone arriba a la derecha
  // ("Santa Verónica · Joseph"). Ninguno de los dos se inventa -- si todavía
  // no hay finca creada, no se escribe el nombre de ninguna.
  const sesion = await auth()
  const finca = await obtenerFinca()
  const quien = [finca?.nombre, sesion?.user?.name].filter(Boolean).join(' · ')

  return (
    <html lang="es-CO" className={`${interfaz.variable} ${estrecha.variable}`}>
      <body>
        <div className="mx-auto max-w-[1120px] px-7">
          <header className="flex items-center justify-between border-b border-borde py-[22px]">
            <a href="/" className="text-[18px] font-extrabold tracking-[0.2em] text-monte no-underline">
              SOFÍA
            </a>
            <Navegacion />
            <div className="text-[12.5px] text-carbon-3">{quien}</div>
          </header>
        </div>
        {children}
      </body>
    </html>
  )
}
```

`src/ui/Navegacion.tsx` (cliente: necesita saber en qué ruta está):

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DESTINOS = [
  { href: '/', texto: 'Ganado' },
  { href: '/anotar', texto: 'Anotar' },
  { href: '/finca', texto: 'Finca' },
] as const

export function Navegacion() {
  const ruta = usePathname()

  return (
    <nav className="flex gap-[2px] rounded bg-crema-2 p-[3px]">
      {DESTINOS.map((destino) => {
        // '/' solo está activo en '/' exacto: si no, cualquier ruta lo
        // encendería y se verían dos destinos marcados a la vez.
        const activo =
          destino.href === '/' ? ruta === '/' : ruta === destino.href || ruta.startsWith(`${destino.href}/`)
        return (
          <Link
            key={destino.href}
            href={destino.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-[2px] px-[18px] py-2 text-[13.5px] font-semibold no-underline ${
              activo ? 'bg-monte text-crema' : 'text-carbon-2'
            }`}
          >
            {destino.texto}
          </Link>
        )
      })}
    </nav>
  )
}
```

`src/ui/Marco.tsx`:

```tsx
export function Marco({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1120px] px-7 pb-24">{children}</div>
}
```

`src/ui/Boton.tsx`:

```tsx
import Link from 'next/link'

type Props = {
  children: React.ReactNode
  href?: string
  fantasma?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function Boton({ children, href, fantasma, type = 'button', disabled }: Props) {
  const clases = `inline-block rounded px-5 py-3 text-[14px] font-semibold no-underline ${
    fantasma
      ? 'border border-borde-2 bg-white text-carbon'
      : 'border-0 bg-monte text-crema'
  } ${disabled ? 'opacity-50' : ''}`

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled} className={clases}>
      {children}
    </button>
  )
}
```

- [x] **Step 5: Poner en pie las tres rutas, vacías por ahora**

Estas tres son andamios: las Tareas 3, 6 y 10 las llenan. Sin ellas la prueba del Paso 1 no puede pasar porque `/anotar/pesos` y `/finca` devuelven 404.

`src/app/page.tsx` — reemplazar el contenido entero por:

```tsx
import { Marco } from '@/ui/Marco'

export const dynamic = 'force-dynamic'

export default function Ganado() {
  return (
    <Marco>
      <h1 className="pt-13 text-[40px] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
        El ganado
      </h1>
      <footer className="mt-18 border-t border-borde pt-[18px] text-[12px] text-carbon-3">
        SOFÍA — por Sofanor Echeverría.
      </footer>
    </Marco>
  )
}
```

`src/app/anotar/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function Anotar() {
  redirect('/anotar/pesos')
}
```

`src/app/anotar/pesos/page.tsx`:

```tsx
import { Marco } from '@/ui/Marco'

export default function Pesos() {
  return <Marco>Pesos</Marco>
}
```

`src/app/finca/page.tsx`:

```tsx
import { Marco } from '@/ui/Marco'

export default function Finca() {
  return <Marco>La finca</Marco>
}
```

- [x] **Step 6: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/caparazon.spec.ts`
Expected: PASS, las tres.

Run: `npx tsc --noEmit && npm run test`
Expected: sin errores de tipos, 291 pruebas verdes. Las siete pantallas viejas siguen funcionando por los alias de color del Paso 3, aunque ya no estén en el encabezado — se llega a ellas por URL directa hasta la Tarea 11.

- [x] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx src/app/anotar src/app/finca src/ui e2e/caparazon.spec.ts e2e/preparar.ts
git commit -m "diseño: el caparazón pasa de nueve pantallas a tres destinos"
```

---

### Task 2: La curva de peso del lote

**Files:**
- Create: `src/datos/serie.ts`
- Test: `src/datos/serie.test.ts`

**Interfaces:**
- Consumes: `historialDeAnimal` y `listarAnimalesDeLote` de `src/datos/`, `leerGdpObjetivo` de `src/datos/parametros.ts`, `diasEntre` de `src/calc/fechas.ts`.
- Produces:

```typescript
export type PuntoSerie = {
  fecha: FechaISO
  pesoPromedioKg: number
  /** Cuántos animales entraron en este promedio. */
  animales: number
  /** A cuánto habrían llegado con el gdp objetivo desde su entrada. Null si no hay objetivo configurado. */
  objetivoKg: number | null
}

export type SerieLote = {
  puntos: PuntoSerie[]
  /** Total de animales activos del lote, para poder decir "cubrió 10 de 14". */
  animalesDelLote: number
}

export async function serieDePesoPromedio(loteId: string, hoy: FechaISO): Promise<SerieLote>
```

**Regla que define la función:** en cada fecha en que hubo pesaje, el promedio incluye a **todos** los animales activos que ya habían entrado, usando para cada uno su peso conocido más reciente en esa fecha (o su peso de entrada, si nunca lo han pesado). Sin eso, una tanda que solo alcanzó a 10 de 14 hace que el promedio brinque —si los 4 que faltaron eran los flacos, la curva sube sin que ningún animal haya engordado— y el dueño lee una mejora que no pasó. `animales` cuenta cuántos se pesaron **ese día**, que es el dato con el que el pie de la gráfica avisa la cobertura.

- [x] **Step 1: Escribir las pruebas que fallan**

Crear `src/datos/serie.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { crearLote } from './lotes'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'
import { serieDePesoPromedio } from './serie'

let loteId: string
let ids: Record<string, string>

beforeEach(async () => {
  await limpiarTablasOperativas()
  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-01-15' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002'],
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-01-15',
    edadEntradaMeses: null,
    pesos: { '001': 200, '002': 220 },
  })
  ids = Object.fromEntries((await listarAnimalesDeLote(loteId)).map((a) => [a.chapeta, a.id]))
})

describe('serieDePesoPromedio', () => {
  it('el primer punto es la entrada, con el promedio de los pesos de entrada', async () => {
    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    expect(serie.puntos[0].fecha).toBe('2026-01-15')
    expect(serie.puntos[0].pesoPromedioKg).toBe(210)
    expect(serie.animalesDelLote).toBe(2)
  })

  it('cada pesaje agrega un punto con el promedio de ese día', async () => {
    await guardarPesaje(
      {
        fecha: '2026-02-15',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [
          { animalId: ids['001'], pesoKg: 230 },
          { animalId: ids['002'], pesoKg: 250 },
        ],
      },
      '2026-03-01',
    )

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    expect(serie.puntos).toHaveLength(2)
    expect(serie.puntos[1]).toMatchObject({ fecha: '2026-02-15', pesoPromedioKg: 240, animales: 2 })
  })

  it('una tanda que no alcanzó a todos no brinca: al que faltó se le cuenta su peso anterior', async () => {
    await guardarPesaje(
      {
        fecha: '2026-02-15',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: ids['001'], pesoKg: 230 }],
      },
      '2026-03-01',
    )

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    // 230 del que sí se pesó, 220 del que no (su peso de entrada). No 230:
    // promediar solo a los pesados haría subir la curva sin que nadie engorde.
    expect(serie.puntos[1].pesoPromedioKg).toBe(225)
    // Pero la cobertura del día sí dice 1: es lo que avisa el pie de la gráfica.
    expect(serie.puntos[1].animales).toBe(1)
  })

  it('la trayectoria objetivo sale del gdp configurado y de los días desde la entrada', async () => {
    await guardarParametro('gdp_objetivo', '800', '2026-01-01', 'u1')
    await guardarPesaje(
      {
        fecha: '2026-02-15',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [
          { animalId: ids['001'], pesoKg: 230 },
          { animalId: ids['002'], pesoKg: 250 },
        ],
      },
      '2026-03-01',
    )

    const serie = await serieDePesoPromedio(loteId, '2026-03-01')

    // 31 días a 800 g/día son 24,8 kg sobre el promedio de entrada de 210.
    expect(serie.puntos[1].objetivoKg).toBe(234.8)
  })

  it('sin gdp objetivo configurado no se inventa una trayectoria', async () => {
    const serie = await serieDePesoPromedio(loteId, '2026-03-01')
    expect(serie.puntos[0].objetivoKg).toBeNull()
  })
})
```

- [x] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx vitest run src/datos/serie.test.ts`
Expected: FAIL — «Failed to resolve import "./serie"».

- [x] **Step 3: Escribir la implementación mínima**

`src/datos/serie.ts`:

```typescript
import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aKg } from './conversion'
import { leerGdpObjetivo } from './parametros'

export type PuntoSerie = {
  fecha: FechaISO
  pesoPromedioKg: number
  animales: number
  objetivoKg: number | null
}

export type SerieLote = {
  puntos: PuntoSerie[]
  animalesDelLote: number
}

function redondear(kg: number): number {
  return Math.round(kg * 10) / 10
}

/**
 * La curva de engorde del lote: un punto en la entrada y uno por cada fecha
 * en que hubo pesaje.
 *
 * En cada punto el promedio incluye a TODOS los animales activos que ya
 * habían entrado, con su peso conocido más reciente a esa fecha. Promediar
 * solo a los que se pesaron ese día haría brincar la curva cuando la tanda no
 * alcanza a todos -- si los que faltaron eran los flacos, el promedio sube sin
 * que ningún animal haya engordado, y el dueño lee una mejora que no pasó.
 * `animales` sí cuenta solo a los de ese día: es la cobertura que se avisa al
 * pie de la gráfica.
 */
export async function serieDePesoPromedio(loteId: string, hoy: FechaISO): Promise<SerieLote> {
  const animales = await prisma.animal.findMany({
    where: { loteId, estado: 'activo' },
    select: { id: true, fechaEntrada: true, pesoEntradaKg: true },
  })
  if (animales.length === 0) return { puntos: [], animalesDelLote: 0 }

  const mediciones = await prisma.medicion.findMany({
    where: { animalId: { in: animales.map((a) => a.id) }, pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
  })

  const entradas = new Map(
    animales.map((a) => [a.id, { fecha: aFechaISO(a.fechaEntrada), pesoKg: aKg(a.pesoEntradaKg) }]),
  )
  const porAnimal = new Map<string, { fecha: FechaISO; pesoKg: number }[]>()
  for (const medicion of mediciones) {
    const fecha = aFechaISO(medicion.pesaje.fecha)
    const lista = porAnimal.get(medicion.animalId) ?? []
    lista.push({ fecha, pesoKg: aKg(medicion.pesoKg) })
    porAnimal.set(medicion.animalId, lista)
  }
  for (const lista of porAnimal.values()) lista.sort((a, b) => a.fecha.localeCompare(b.fecha))

  // La entrada más vieja del lote abre la curva; después, una fecha por tanda.
  const primeraEntrada = [...entradas.values()].map((e) => e.fecha).sort()[0]
  const fechasDePesaje = [...new Set(mediciones.map((m) => aFechaISO(m.pesaje.fecha)))].sort()
  const fechas = [primeraEntrada, ...fechasDePesaje.filter((f) => f !== primeraEntrada)]

  const gdpObjetivo = await leerGdpObjetivo(hoy)

  const puntos = fechas.map((fecha) => {
    const presentes = animales.filter((a) => entradas.get(a.id)!.fecha <= fecha)
    const pesos = presentes.map((a) => {
      const historial = porAnimal.get(a.id) ?? []
      const hasta = historial.filter((m) => m.fecha <= fecha)
      return hasta.at(-1)?.pesoKg ?? entradas.get(a.id)!.pesoKg
    })
    const pesoPromedioKg = redondear(pesos.reduce((t, p) => t + p, 0) / pesos.length)

    const pesoEntradaPromedio =
      presentes.reduce((t, a) => t + entradas.get(a.id)!.pesoKg, 0) / presentes.length
    const diasPromedio =
      presentes.reduce((t, a) => t + diasEntre(entradas.get(a.id)!.fecha, fecha), 0) / presentes.length

    return {
      fecha,
      pesoPromedioKg,
      animales: mediciones.filter((m) => aFechaISO(m.pesaje.fecha) === fecha).length,
      objetivoKg:
        gdpObjetivo === null
          ? null
          : redondear(pesoEntradaPromedio + (gdpObjetivo / 1000) * diasPromedio),
    }
  })

  return { puntos, animalesDelLote: animales.length }
}
```

`Pesaje.anuladoEn` es el campo que marca una tanda anulada, y `Medicion.pesaje` la relación: el `where` de arriba es el mismo que ya usa `historialDeAnimal` en `src/datos/pesajes.ts:27`. Un pesaje anulado no entra en la curva.

- [x] **Step 4: Correr las pruebas y verlas pasar**

Run: `npx vitest run src/datos/serie.test.ts`
Expected: PASS, las cinco.

- [x] **Step 5: Commit**

```bash
git add src/datos/serie.ts src/datos/serie.test.ts
git commit -m "feat: la curva de peso promedio del lote contra su trayectoria objetivo"
```

---

### Task 3: Ganado — el titular, los avisos y la cinta

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/ui/Titular.tsx`
- Create: `src/ui/Cinta.tsx`
- Test: `e2e/ganado.spec.ts`

**Interfaces:**
- Consumes: `Marco` (Tarea 1); `desempeno`, `normalizarPeriodo` de `src/datos/desempeno.ts`; `frescura` de `src/datos/frescura.ts`; `eventosVencidos` de `src/datos/sanidad.ts`; `listarSuministrosVigentes` de `src/datos/novedades.ts`; `listarPotreros` de `src/datos/potreros.ts`; `listarLotes` de `src/datos/lotes.ts`; `leerUmbrales`, `leerGdpObjetivo`, `leerParametro`, `CLAVE_HECTAREAS_UTILES` de `src/datos/parametros.ts`; `pesoVivoPorLote` de `src/datos/pesajes.ts`; `kgProducidos` de `src/calc/produccion.ts`; `calcularCarga`, `diasOcupacion` de `src/calc/potrero.ts`.
- Produces: `Titular({ children, avisos })` y `Cinta({ celdas })`, que las Tareas 6, 9 y 10 reutilizan.

```typescript
export type Aviso = { texto: string; enlace?: { href: string; texto: string }; grave?: boolean }
export type Celda = { rotulo: string; valor: string; unidad?: string }

/**
 * Parte '3.892,0 kg' en { valor: '3.892,0', unidad: 'kg' }. La cinta del
 * mockup dibuja la unidad en chico y en gris al lado de la cifra, pero
 * `formatearKg` y `formatearGdp` la devuelven pegada -- y son la única fuente
 * del formato colombiano, así que se parte lo que ellas devuelven en vez de
 * mantener un segundo formateador que se desincronice.
 */
export function separarUnidad(formateado: string): { valor: string; unidad?: string }
```

`separarUnidad` va en `src/ui/formato.ts` con su prueba en `src/ui/formato.test.ts`: parte por el primer espacio que separa el número de la unidad, y devuelve `{ valor: '—' }` sin unidad cuando recibe `SIN_DATO`.

**Lo que dice el titular.** Es prosa, no tarjetas. Tres frases, todas con datos reales:
1. «*[Lote]* va en **N g/día**. *M novillos* están quedados.» — el promedio sale de `desempeno(...).resumen`, los quedados son las filas con clasificación `bajo` o `critico`.
2. Debajo: «*N* en *[Potrero]*, *D* días en ese potrero. Pesaste hace *K* días. El objetivo son *G*.» — el potrero y los días de `listarPotreros`, los días desde el último pesaje de `frescura`, el objetivo de `leerGdpObjetivo`.
3. Los avisos, uno por línea: los eventos sanitarios vencidos (grave, punto barro) y los suministros vigentes (punto gris).

Ninguna de esas frases puede quedar a medias cuando falta el dato. Si no hay gdp objetivo configurado, la frase del objetivo no se escribe —no se escribe «el objetivo son —»—. Si nunca han pesado, la frase del pesaje dice «Todavía no has pesado a este lote».

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `e2e/ganado.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { entrar, sembrarLoteConPesajes } from './preparar'

test.beforeEach(async ({ page }) => {
  await sembrarLoteConPesajes()
  await entrar(page)
  await page.goto('/')
})

test('el titular dice cómo va el lote y cuántos están quedados, con datos reales', async ({ page }) => {
  const titular = page.locator('h1')
  await expect(titular).toContainText('Ceba 01')
  await expect(titular).toContainText('g/día')
  // No una plantilla a medio llenar.
  await expect(titular).not.toContainText('undefined')
  await expect(titular).not.toContainText('NaN')
})

test('la cinta trae las cuatro cifras del lote', async ({ page }) => {
  const cinta = page.getByTestId('cinta')
  await expect(cinta).toContainText('Novillos')
  await expect(cinta).toContainText('Peso vivo')
  await expect(cinta).toContainText('Producido en el ciclo')
  await expect(cinta).toContainText('Carga')
})

test('un evento sanitario vencido aparece como aviso con su enlace para anotarlo', async ({ page }) => {
  const aviso = page.getByTestId('avisos').getByText(/venci/i)
  await expect(aviso).toBeVisible()
  await expect(page.getByTestId('avisos').getByRole('link', { name: 'Anotarla' })).toHaveAttribute(
    'href',
    '/anotar/sanidad',
  )
})

test('sin gdp objetivo configurado no se escribe la frase del objetivo a medias', async ({ page }) => {
  await page.goto('/?lote=sin-objetivo')
  await expect(page.locator('h1').locator('..')).not.toContainText('El objetivo son —')
})
```

`sembrarLoteConPesajes()` es un ayudante nuevo en `e2e/preparar.ts`: crea la finca, un potrero, el lote «Ceba 01» con 14 animales, dos tandas de pesaje, los parámetros de umbral y gdp objetivo, y un evento sanitario ya vencido. Escribirlo reutilizando las funciones de `src/datos/` (no SQL crudo), siguiendo el patrón que ya usa `e2e/preparar.ts` para las demás pruebas.

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx playwright test e2e/ganado.spec.ts`
Expected: FAIL — la página solo dice «El ganado»; no hay `h1` con el lote, ni `data-testid="cinta"`, ni avisos.

- [ ] **Step 3: Escribir los dos componentes compartidos**

`src/ui/Titular.tsx`:

```tsx
import Link from 'next/link'

export type Aviso = { texto: string; enlace?: { href: string; texto: string }; grave?: boolean }

export function Titular({ children, avisos = [] }: { children: React.ReactNode; avisos?: Aviso[] }) {
  return (
    <div className="max-w-[820px] pt-13">
      {children}
      {avisos.length > 0 && (
        <div data-testid="avisos" className="mt-[22px] flex flex-col gap-[9px]">
          {avisos.map((aviso) => (
            <div key={aviso.texto} className="flex items-center gap-[10px] text-[14px] text-carbon-2">
              <span
                aria-hidden
                className={`h-[6px] w-[6px] flex-none rounded-full ${
                  aviso.grave ? 'bg-barro' : 'bg-carbon-3'
                }`}
              />
              <span>{aviso.texto}</span>
              {aviso.enlace && (
                <Link href={aviso.enlace.href} className="text-carbon underline underline-offset-[3px]">
                  {aviso.enlace.texto}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

`src/ui/Cinta.tsx`:

```tsx
export type Celda = { rotulo: string; valor: string; unidad?: string }

export function Cinta({ celdas }: { celdas: Celda[] }) {
  return (
    <div
      data-testid="cinta"
      className="mt-10 flex overflow-hidden rounded border border-borde bg-white"
    >
      {celdas.map((celda) => (
        <div key={celda.rotulo} className="flex-1 border-r border-borde px-5 py-4 last:border-r-0">
          <span className="rotulo block">{celda.rotulo}</span>
          <b className="cifra mt-[9px] block text-[25px] font-extrabold leading-none tracking-[-0.02em] text-monte">
            {celda.valor}
            {celda.unidad && (
              <small className="ml-1 text-[14px] font-semibold text-carbon-3">{celda.unidad}</small>
            )}
          </b>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Escribir la mitad de arriba de Ganado**

`src/app/page.tsx` — la pantalla lee todo del servidor y arma las tres frases. El lote que se mira sale de `?lote=`; sin ese parámetro, el primer lote de ceba abierto.

```tsx
import { diasOcupacion, calcularCarga } from '@/calc/potrero'
import { kgProducidos, type AnimalProduccion } from '@/calc/produccion'
import { hoyBogota } from '@/calc/fechas'
import { prisma } from '@/datos/cliente'
import { aKg } from '@/datos/conversion'
import { desempeno, normalizarPeriodo } from '@/datos/desempeno'
import { frescura } from '@/datos/frescura'
import { listarLotes } from '@/datos/lotes'
import { listarSuministrosVigentes } from '@/datos/novedades'
import { CLAVE_HECTAREAS_UTILES, leerGdpObjetivo, leerParametro } from '@/datos/parametros'
import { pesoVivoPorLote } from '@/datos/pesajes'
import { listarPotreros } from '@/datos/potreros'
import { eventosVencidos } from '@/datos/sanidad'
import { Cinta, type Celda } from '@/ui/Cinta'
import { formatearGdp, formatearKg, separarUnidad, SIN_DATO } from '@/ui/formato'
import { Marco } from '@/ui/Marco'
import { Titular, type Aviso } from '@/ui/Titular'

// Todo lo que se ve aquí cambia con el día y con lo que se digitó hace un
// minuto. Sin esto Next prerenderiza la ruta en el build y "pesaste hace N
// días" se congela para siempre.
export const dynamic = 'force-dynamic'

export default async function Ganado({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const hoy = hoyBogota()

  const lotes = (await listarLotes()).filter((lote) => lote.tipo === 'ceba')
  const lote = lotes.find((l) => l.id === params.lote) ?? lotes[0]
  if (!lote) {
    return (
      <Marco>
        <Titular>
          <h1 className="text-[40px] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
            Todavía no hay ningún lote de ceba.
          </h1>
          <p className="mt-[14px] text-[15.5px] text-carbon-2">
            Abre uno desde Anotar → Entrada de ganado y aquí vas a ver cómo viene engordando.
          </p>
        </Titular>
      </Marco>
    )
  }

  const periodo = normalizarPeriodo(params.desde)
  const { filas, resumen } = await desempeno(periodo, hoy)
  const delLote = filas.filter((fila) => fila.lote === lote.nombre)
  const quedados = delLote.filter(
    (fila) => fila.clasificacion === 'bajo' || fila.clasificacion === 'critico',
  )

  const estado = await frescura(hoy)
  const gdpObjetivo = await leerGdpObjetivo(hoy)
  const potreros = await listarPotreros(hoy)
  const potrero = potreros.find((p) => p.loteActual === lote.nombre) ?? null

  // Las tres frases. Cada una se arma solo si tiene con qué: una frase a
  // medias ("el objetivo son —") es peor que no decir nada.
  const frases: string[] = []
  if (potrero) {
    frases.push(
      `${delLote.length} en ${potrero.nombre}, ${diasOcupacion(potrero.desde!, hoy)} días en ese potrero.`,
    )
  }
  frases.push(
    estado.diasDesdeUltimoPesaje === null
      ? 'Todavía no has pesado a este lote.'
      : `Pesaste hace ${estado.diasDesdeUltimoPesaje} días.`,
  )
  if (gdpObjetivo !== null) frases.push(`El objetivo son ${gdpObjetivo}.`)

  const avisos: Aviso[] = []
  for (const evento of await eventosVencidos(hoy)) {
    avisos.push({
      texto: `Hay sanidad vencida: ${evento.producto} de la chapeta ${evento.chapeta}.`,
      enlace: { href: '/anotar/sanidad', texto: 'Anotarla' },
      grave: true,
    })
  }
  for (const suministro of await listarSuministrosVigentes(lote.id)) {
    avisos.push({
      texto: `Les están dando ${suministro.descripcion} desde el ${suministro.fechaInicio}.`,
      enlace: { href: '/anotar/novedad', texto: 'Ver todo lo que reciben' },
    })
  }

  const pesoVivo = (await pesoVivoPorLote('ceba')).get(lote.id) ?? 0
  const animales = await prisma.animal.findMany({
    where: { loteId: lote.id },
    select: { estado: true, pesoEntradaKg: true, pesoSalidaKg: true },
  })
  const ultimoPorAnimal = new Map(delLote.map((fila) => [fila.animalId, fila.pesoActualKg]))
  const paraProduccion: AnimalProduccion[] = animales.map((animal, i) => ({
    estado: animal.estado,
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    pesoUltimoKg: animal.pesoSalidaKg ? aKg(animal.pesoSalidaKg) : (delLote[i]?.pesoActualKg ?? null),
  }))

  const hectareasTexto = await leerParametro(CLAVE_HECTAREAS_UTILES, hoy)
  const hectareas = hectareasTexto === null ? null : Number(hectareasTexto)
  const carga = hectareas ? calcularCarga(pesoVivo, delLote.length, hectareas) : null

  const celdas: Celda[] = [
    { rotulo: 'Novillos', valor: String(delLote.length) },
    { rotulo: 'Peso vivo', ...separarUnidad(formatearKg(pesoVivo)) },
    { rotulo: 'Producido en el ciclo', ...separarUnidad(formatearKg(kgProducidos(paraProduccion))) },
    {
      rotulo: 'Carga',
      valor: carga ? formatearKg(carga.kgPorHa).replace(' kg', '') : SIN_DATO,
      unidad: carga ? 'kg/ha' : undefined,
    },
  ]

  return (
    <Marco>
      <Titular avisos={avisos}>
        <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
          {lote.nombre} va en <b className="font-extrabold text-tierra">{formatearGdp(resumen.promedio)}</b>.{' '}
          {quedados.length > 0 && (
            <u className="font-extrabold text-barro no-underline">
              {quedados.length === 1 ? 'Un novillo está quedado' : `${quedados.length} novillos están quedados`}.
            </u>
          )}
        </h1>
        <p className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">{frases.join(' ')}</p>
      </Titular>

      <Cinta celdas={celdas} />

      <footer className="mt-18 border-t border-borde pt-[18px] text-[12px] text-carbon-3">
        SOFÍA — por Sofanor Echeverría.
      </footer>
    </Marco>
  )
}
```

Los nombres exactos de los campos de `PotreroVista`, `Frescura`, `NovedadVista` y `ResumenPromedio` hay que leerlos en sus módulos (`src/datos/potreros.ts:8`, `src/datos/frescura.ts:9`, `src/datos/novedades.ts:28`, `src/calc/lote.ts:1`) y ajustar el código de arriba a lo que de verdad exponen. Este bloque muestra la forma de la pantalla, no adivina la de esos tipos.

- [ ] **Step 5: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/ganado.spec.ts && npx tsc --noEmit`
Expected: PASS las cuatro, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/ui/Titular.tsx src/ui/Cinta.tsx e2e/ganado.spec.ts e2e/preparar.ts
git commit -m "diseño: la portada de Ganado dice en prosa cómo va el lote"
```

---

### Task 4: Ganado — la gráfica del lote

**Files:**
- Create: `src/app/GraficaLote.tsx`
- Modify: `src/app/page.tsx`
- Test: `e2e/ganado.spec.ts` (se le agregan pruebas)

**Interfaces:**
- Consumes: `serieDePesoPromedio` y `SerieLote` (Tarea 2).
- Produces: `GraficaLote({ serie, objetivoGdp }: { serie: SerieLote; objetivoGdp: number | null })`.

**Cómo se dibuja.** SVG en línea, sin librerías, con `viewBox="0 0 900 260"` y `width="100%"` para que escale. Dos trazos: la trayectoria objetivo punteada en gris (`--color-carbon-3`, `stroke-dasharray: 5 5`) y el peso real en tierra (`--color-tierra`) con un punto por pesaje. La escala del eje Y se calcula de los datos —mínimo y máximo de ambas series, con 10% de aire arriba y abajo—, nunca fija. El pie explica la cobertura: «El último pesaje cubrió 10 de 14: a los otros cuatro se les cuenta su peso del 25 de julio.»

Ese pie es la razón de ser de la gráfica. Sin él, un promedio calculado sobre 10 de 14 animales se lee como si fueran los 14.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar a `e2e/ganado.spec.ts`:

```typescript
test('la gráfica dibuja un punto por pesaje y la trayectoria objetivo', async ({ page }) => {
  const grafica = page.getByRole('img', { name: /peso promedio del lote/i })
  await expect(grafica).toBeVisible()
  // Dos tandas sembradas + el punto de entrada.
  await expect(grafica.locator('circle')).toHaveCount(3)
  await expect(grafica.locator('path.meta')).toHaveCount(1)
})

test('el pie de la gráfica avisa cuando la última tanda no alcanzó a todos', async ({ page }) => {
  await expect(page.locator('figcaption')).toContainText('de 14')
})

test('sin gdp objetivo configurado la gráfica se dibuja sin trayectoria, no vacía', async ({ page }) => {
  await page.goto('/?lote=sin-objetivo')
  const grafica = page.getByRole('img', { name: /peso promedio del lote/i })
  await expect(grafica).toBeVisible()
  await expect(grafica.locator('path.meta')).toHaveCount(0)
})
```

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx playwright test e2e/ganado.spec.ts -g "gráfica"`
Expected: FAIL — no existe ningún `role="img"` en la página.

- [ ] **Step 3: Escribir la gráfica**

`src/app/GraficaLote.tsx`:

```tsx
import type { SerieLote } from '@/datos/serie'
import { formatearKg } from '@/ui/formato'

const ANCHO = 900
const ALTO = 260
const IZQ = 58
const DER = 880
const ARRIBA = 26
const ABAJO = 214

function nombreDeMes(fecha: string): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [, mes, dia] = fecha.split('-')
  return `${Number(dia)} ${meses[Number(mes) - 1]}`
}

export function GraficaLote({ serie }: { serie: SerieLote }) {
  if (serie.puntos.length < 2) {
    return (
      <figure className="rounded border border-borde bg-white px-6 py-[22px]">
        <figcaption className="text-[12.5px] text-carbon-2">
          Con un solo pesaje todavía no hay curva que dibujar. Anota la próxima tanda y aquí va a
          aparecer cómo viene engordando el lote.
        </figcaption>
      </figure>
    )
  }

  // La escala sale de los datos, nunca de números fijos: un lote de destete y
  // uno de ceba gorda no caben en la misma regla.
  const valores = serie.puntos.flatMap((p) => [p.pesoPromedioKg, p.objetivoKg]).filter((v): v is number => v !== null)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const aire = (max - min) * 0.1 || 10
  const y = (kg: number) => ABAJO - ((kg - (min - aire)) / (max + aire - (min - aire))) * (ABAJO - ARRIBA)
  const x = (i: number) => IZQ + (i / (serie.puntos.length - 1)) * (DER - IZQ)

  const trazo = (obtener: (p: (typeof serie.puntos)[number]) => number | null) =>
    serie.puntos
      .map((p, i) => ({ v: obtener(p), i }))
      .filter((p): p is { v: number; i: number } => p.v !== null)
      .map((p, n) => `${n === 0 ? 'M' : 'L'}${x(p.i)},${y(p.v)}`)
      .join(' ')

  const ultimo = serie.puntos.at(-1)!
  const hayObjetivo = serie.puntos.some((p) => p.objetivoKg !== null)

  return (
    <figure className="rounded border border-borde bg-white px-6 pb-[18px] pt-[22px]">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        width="100%"
        height="240"
        role="img"
        aria-label={`Peso promedio del lote en ${serie.puntos.length} pesajes`}
      >
        {[0, 1, 2, 3].map((n) => {
          const linea = ARRIBA + ((ABAJO - ARRIBA) / 3) * n
          const kg = min - aire + ((max + aire - (min - aire)) / 3) * (3 - n)
          return (
            <g key={n}>
              <line x1={IZQ} y1={linea} x2={DER} y2={linea} stroke="var(--color-borde)" strokeWidth={1} />
              <text x={IZQ - 12} y={linea + 4} textAnchor="end" className="fill-carbon-3 text-[10.5px]">
                {Math.round(kg)}
              </text>
            </g>
          )
        })}

        {hayObjetivo && (
          <path
            className="meta"
            d={trazo((p) => p.objetivoKg)}
            fill="none"
            stroke="var(--color-carbon-3)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}

        <path d={trazo((p) => p.pesoPromedioKg)} fill="none" stroke="var(--color-tierra)" strokeWidth={2} />
        {serie.puntos.map((p, i) => (
          <circle
            key={p.fecha}
            cx={x(i)}
            cy={y(p.pesoPromedioKg)}
            r={i === serie.puntos.length - 1 ? 6 : 5}
            fill="var(--color-tierra)"
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {serie.puntos.map((p, i) => (
          <text key={p.fecha} x={x(i)} y={246} textAnchor="middle" className="fill-carbon-3 text-[11px]">
            {nombreDeMes(p.fecha)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-[14px] text-[12.5px] leading-[1.45] text-carbon-2">
        Peso promedio de los {serie.animalesDelLote} animales del lote.
        {hayObjetivo && ' La línea punteada es a dónde llegarían con el objetivo que fijaste.'}
        {ultimo.animales < serie.animalesDelLote &&
          ` El último pesaje cubrió ${ultimo.animales} de ${serie.animalesDelLote}: a los demás se les cuenta su peso anterior.`}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 4: Colgar la gráfica de la pantalla**

En `src/app/page.tsx`, entre la `<Cinta>` y el pie:

```tsx
<h2 className="rotulo mt-13 mb-4">Cómo viene engordando el lote</h2>
<GraficaLote serie={await serieDePesoPromedio(lote.id, hoy)} />
```

- [ ] **Step 5: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/ganado.spec.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/GraficaLote.tsx src/app/page.tsx e2e/ganado.spec.ts
git commit -m "diseño: la curva del lote contra su trayectoria objetivo, con la cobertura al pie"
```

---

### Task 5: Ganado — filtros, chips, rejilla y tabla

**Files:**
- Create: `src/app/FiltrosGanado.tsx`
- Create: `src/app/RejillaGanado.tsx`
- Modify: `src/app/page.tsx`
- Test: `e2e/ganado.spec.ts` (se le agregan pruebas)

**Interfaces:**
- Consumes: `FilaDesempeno` de `src/datos/desempeno.ts`, `Clasificacion` de `src/calc/clasificacion.ts`, `LoteVista` de `src/datos/lotes.ts`.
- Produces: `FiltrosGanado({ lotes, filas, activos })` (cliente) y `RejillaGanado({ filas, vista, pesoDeVenta })` (servidor).

**Los filtros escriben en la URL, no en estado de React.** `?lote=`, `?desde=`, `?ver=`, `?orden=`, `?filtro=`, `?q=`, `?vista=`. Así el dueño puede guardar en el navegador «Ceba 01, quedados primero» y volver ahí mañana, la pantalla sigue siendo del servidor —sin traerse los 56 animales al cliente— y el botón Atrás funciona. `FiltrosGanado` es el único componente de cliente: lee `useSearchParams`, escribe con `useRouter().replace`.

**Dónde vuelven las cosas que el mockup parecía haber quitado:**
- El selector de periodo de la vieja `/como-vamos` es el filtro **«Desde»** (`?desde=`), con las cinco opciones de `Periodo`: último pesaje, 30, 60, 90 días, acumulado.
- Las columnas de kg ganados, días en finca y ganancia acumulada son la vista **«Tabla»** (`?vista=tabla`).
- Los animales que ya salieron son el chip **«Ya salieron N»**, que hoy vive en `/salidas`.

**Los chips y las tarjas.** Chips: «Todos N», «Quedados N», «Sin pesar N», «Listos N», «Ya salieron N». «Listos» son los que pasaron el peso de venta (`leerParametro('peso_venta', hoy)`); si ese parámetro no está configurado, el chip no se dibuja —no se inventa un peso de venta—. «Sin pesar» son los que no entraron en la última tanda: su tarja va apagada (`.frio`) y su pie dice «sin pesar en [mes]».

Cada tarja lleva chapeta, gdp grande, unidad y una línea de pie con el peso. Barra inferior de 3px: barro si va quedado, monte si está listo, tinta al 45% si va normal.

- [ ] **Step 1: Escribir las pruebas que fallan**

Agregar a `e2e/ganado.spec.ts`:

```typescript
test('el chip de quedados deja solo a los quedados, y la cuenta cuadra', async ({ page }) => {
  const cuenta = await page.getByRole('button', { name: /^Quedados/ }).innerText()
  const esperados = Number(cuenta.replace(/\D/g, ''))

  await page.getByRole('button', { name: /^Quedados/ }).click()
  await expect(page.getByTestId('tarja')).toHaveCount(esperados)
})

test('el filtro Desde cambia el periodo contra el que se mide, y queda en la URL', async ({ page }) => {
  await page.getByLabel('Desde').selectOption('dias_30')
  await expect(page).toHaveURL(/desde=dias_30/)
})

test('la vista Tabla trae las columnas que estaban en Cómo vamos', async ({ page }) => {
  await page.getByRole('button', { name: 'Tabla' }).click()
  const encabezados = page.locator('table thead th')
  await expect(encabezados).toContainText(['Chapeta'])
  await expect(encabezados).toContainText(['Kg ganados'])
  await expect(encabezados).toContainText(['Días en finca'])
})

test('buscar una chapeta deja solo esa', async ({ page }) => {
  await page.getByPlaceholder('Buscar chapeta').fill('001')
  await expect(page.getByTestId('tarja')).toHaveCount(1)
  await expect(page.getByTestId('tarja')).toContainText('001')
})

test('cada tarja lleva a la ficha de su animal', async ({ page }) => {
  await page.getByTestId('tarja').first().click()
  await expect(page).toHaveURL(/\/animales\//)
})

test('sin peso de venta configurado no se inventa el chip de listos', async ({ page }) => {
  await page.goto('/?lote=sin-peso-venta')
  await expect(page.getByRole('button', { name: /^Listos/ })).toHaveCount(0)
})
```

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx playwright test e2e/ganado.spec.ts -g "chip|filtro|Tabla|chapeta|tarja"`
Expected: FAIL — no existen ni los chips ni las tarjas.

- [ ] **Step 3: Escribir los filtros**

`src/app/FiltrosGanado.tsx`:

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type Chip = { clave: string; texto: string; cuenta: number }

const PERIODOS = [
  { valor: 'ultimo_pesaje', texto: 'El último pesaje' },
  { valor: 'dias_30', texto: 'Los últimos 30 días' },
  { valor: 'dias_60', texto: 'Los últimos 60 días' },
  { valor: 'dias_90', texto: 'Los últimos 90 días' },
  { valor: 'acumulado', texto: 'Desde que entraron' },
] as const

export function FiltrosGanado({
  lotes,
  chips,
}: {
  lotes: { id: string; nombre: string; animales: number }[]
  chips: Chip[]
}) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  // Un solo lugar donde se escribe la URL: cambiar un filtro conserva los
  // demás. Sin esto, elegir un lote borraría el orden y la búsqueda.
  function poner(clave: string, valor: string | null) {
    const siguientes = new URLSearchParams(params.toString())
    if (valor === null || valor === '') siguientes.delete(clave)
    else siguientes.set(clave, valor)
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  const caja =
    'inline-flex items-center gap-2 rounded border border-borde bg-white px-3 py-2 text-[13.5px] text-carbon'

  return (
    <div className="mb-4 flex flex-wrap items-center gap-[9px]">
      <label className={caja}>
        <span className="text-[12px] font-semibold text-carbon-3">Lote</span>
        <select
          aria-label="Lote"
          className="bg-transparent outline-none"
          value={params.get('lote') ?? lotes[0]?.id}
          onChange={(e) => poner('lote', e.target.value)}
        >
          {lotes.map((lote) => (
            <option key={lote.id} value={lote.id}>
              {lote.nombre} · {lote.animales} animales
            </option>
          ))}
        </select>
      </label>

      <label className={caja}>
        <span className="text-[12px] font-semibold text-carbon-3">Desde</span>
        <select
          aria-label="Desde"
          className="bg-transparent outline-none"
          value={params.get('desde') ?? 'ultimo_pesaje'}
          onChange={(e) => poner('desde', e.target.value)}
        >
          {PERIODOS.map((periodo) => (
            <option key={periodo.valor} value={periodo.valor}>
              {periodo.texto}
            </option>
          ))}
        </select>
      </label>

      <label className={caja}>
        <span className="text-[12px] font-semibold text-carbon-3">Orden</span>
        <select
          aria-label="Orden"
          className="bg-transparent outline-none"
          value={params.get('orden') ?? 'peor'}
          onChange={(e) => poner('orden', e.target.value)}
        >
          <option value="peor">Peor primero</option>
          <option value="mejor">Mejor primero</option>
          <option value="chapeta">Por chapeta</option>
        </select>
      </label>

      <label className={caja}>
        <span aria-hidden>🔍</span>
        <input
          placeholder="Buscar chapeta"
          className="w-[118px] bg-transparent outline-none"
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => poner('q', e.target.value)}
        />
      </label>

      <span className="flex-1" />

      {chips.map((chip) => {
        const activo = (params.get('filtro') ?? 'todos') === chip.clave
        return (
          <button
            key={chip.clave}
            type="button"
            onClick={() => poner('filtro', chip.clave === 'todos' ? null : chip.clave)}
            className={`rounded-full border px-[13px] py-[7px] text-[12.5px] ${
              activo ? 'border-monte bg-monte font-semibold text-crema' : 'border-borde bg-white text-carbon-2'
            }`}
          >
            {chip.texto} {chip.cuenta}
          </button>
        )
      })}

      <div className="flex gap-[2px] rounded bg-crema-2 p-[3px]">
        {(['rejilla', 'tabla'] as const).map((vista) => {
          const activo = (params.get('vista') ?? 'rejilla') === vista
          return (
            <button
              key={vista}
              type="button"
              onClick={() => poner('vista', vista === 'rejilla' ? null : vista)}
              className={`rounded-[2px] px-3 py-[6px] text-[12.5px] font-semibold ${
                activo ? 'bg-white text-carbon shadow-sm' : 'text-carbon-2'
              }`}
            >
              {vista === 'rejilla' ? 'Rejilla' : 'Tabla'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Escribir la rejilla y la tabla**

`src/app/RejillaGanado.tsx`:

```tsx
import Link from 'next/link'
import type { FilaDesempeno } from '@/datos/desempeno'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

export type FilaGanado = FilaDesempeno & {
  /** No entró en la última tanda: la tarja va apagada. */
  sinPesarEnLaUltima: boolean
  listo: boolean
}

export function RejillaGanado({ filas, vista }: { filas: FilaGanado[]; vista: 'rejilla' | 'tabla' }) {
  if (filas.length === 0) {
    return <p className="text-[14px] text-carbon-2">Ningún animal cumple ese filtro.</p>
  }

  if (vista === 'tabla') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-borde">
              {['Chapeta', 'Peso', 'Kg ganados', 'g/día del periodo', 'g/día acumulada', 'Días en finca'].map(
                (encabezado) => (
                  <th key={encabezado} className="rotulo pb-3 text-left">
                    {encabezado}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.animalId} className="border-b border-borde">
                <td className="py-[9px]">
                  <Link href={`/animales/${fila.animalId}`} className="font-extrabold">
                    {fila.chapeta}
                  </Link>
                </td>
                <td className="cifra py-[9px]">{formatearKg(fila.pesoActualKg)}</td>
                <td className="cifra py-[9px]">{formatearKg(fila.kgGanados)}</td>
                <td className="cifra py-[9px]">{formatearGdp(fila.gdpPeriodo)}</td>
                <td className="cifra py-[9px]">{formatearGdp(fila.gdpAcumulada)}</td>
                <td className="cifra py-[9px]">{fila.diasEnFinca}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] overflow-hidden rounded border border-b-0 border-l-0 border-borde">
      {filas.map((fila) => {
        const mal = fila.clasificacion === 'bajo' || fila.clasificacion === 'critico'
        return (
          <Link
            key={fila.animalId}
            href={`/animales/${fila.animalId}`}
            data-testid="tarja"
            className={`relative block border-l border-t border-borde px-[15px] pb-[13px] pt-[15px] no-underline ${
              fila.sinPesarEnLaUltima ? 'bg-crema-2' : 'bg-white'
            }`}
          >
            <div className={`text-[14.5px] font-extrabold tracking-[0.08em] text-carbon-3 ${fila.sinPesarEnLaUltima ? 'opacity-55' : ''}`}>
              {fila.chapeta}
            </div>
            <div
              className={`cifra mt-[13px] text-[30px] font-extrabold leading-none tracking-[-0.03em] ${
                mal ? 'text-barro' : fila.listo ? 'text-monte' : 'text-carbon'
              } ${fila.sinPesarEnLaUltima ? 'opacity-55' : ''}`}
            >
              {fila.gdpPeriodo === null ? SIN_DATO : Math.round(fila.gdpPeriodo)}
            </div>
            <div className="mt-1 text-[11px] text-carbon-3">g/día</div>
            <div className={`mt-[11px] text-[12.5px] ${fila.sinPesarEnLaUltima ? 'italic text-carbon-3' : 'text-carbon-2'}`}>
              {fila.sinPesarEnLaUltima
                ? 'no entró en la última tanda'
                : `${formatearKg(fila.pesoActualKg)}${fila.listo ? ' · listo' : ''}`}
            </div>
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 h-[3px] ${
                mal ? 'bg-barro' : fila.listo ? 'bg-monte' : 'bg-borde-2 opacity-45'
              }`}
            />
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Armar el filtrado en la pantalla**

En `src/app/page.tsx`, después de calcular `delLote`: aplicar `?q=` (chapeta que contenga el texto), `?filtro=` (chip), `?orden=`, construir los chips con sus cuentas, y renderizar `<FiltrosGanado>` y `<RejillaGanado>` bajo un `<h2 className="rotulo">El ganado</h2>`. El chip «Listos» solo se agrega si `leerParametro('peso_venta', hoy)` devuelve un valor; el chip «Ya salieron» cuenta los animales del lote con estado distinto de `activo`.

El orden por defecto es «peor primero»: el dueño abre la pantalla para ver a quién hay que mirarle algo, no para ver al campeón.

- [ ] **Step 6: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/ganado.spec.ts && npx tsc --noEmit && npm run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/FiltrosGanado.tsx src/app/RejillaGanado.tsx src/app/page.tsx e2e/ganado.spec.ts
git commit -m "diseño: la lista del ganado con filtros en la URL, rejilla y tabla"
```

---

### Task 6: Anotar — el caparazón de modos y el modo Pesos

**Files:**
- Create: `src/app/anotar/layout.tsx`
- Create: `src/app/anotar/ModosAnotar.tsx`
- Move: `src/app/digitar/TablaPesaje.tsx` → `src/app/anotar/pesos/TablaPesaje.tsx`
- Move: `src/app/digitar/PesajesRecientes.tsx` → `src/app/anotar/pesos/PesajesRecientes.tsx`
- Move: `src/app/digitar/acciones.ts` → `src/app/anotar/pesos/acciones.ts`
- Modify: `src/app/anotar/pesos/page.tsx`
- Test: `e2e/anotar.spec.ts`

**Interfaces:**
- Produces: `ModosAnotar()` — la cinta de seis pestañas, cliente, marca la activa con `usePathname`.

Los seis modos, en este orden: **Pesos · Venta o muerte · Novedad · Mover lote · Entrada de ganado · Sanidad**. Es el orden del mockup y es el orden de frecuencia real: se pesa todas las semanas, se vende dos veces al año.

**Nada de la lógica de digitar cambia.** `TablaPesaje`, `PesajesRecientes` y sus acciones se mudan de carpeta y se les aplica el sistema visual; su comportamiento —revisar antes de guardar, la advertencia por dedazo, el reinicio del formulario, la anulación— queda igual. Las pruebas de `e2e/digitar.spec.ts` se mudan a `e2e/anotar.spec.ts` cambiando solo la URL de `/digitar` a `/anotar/pesos`. **Si alguna de esas pruebas falla después de la mudanza, es que se rompió algo: arreglarlo, no cambiar la prueba.**

- [ ] **Step 1: Escribir la prueba del caparazón que falla**

Crear `e2e/anotar.spec.ts` (arriba del archivo; las pruebas mudadas de digitar van debajo, en el Paso 5):

```typescript
import { expect, test } from '@playwright/test'
import { entrar, sembrarLoteConPesajes } from './preparar'

test.beforeEach(async ({ page }) => {
  await sembrarLoteConPesajes()
  await entrar(page)
})

test('Anotar ofrece los seis modos, en orden', async ({ page }) => {
  await page.goto('/anotar/pesos')
  await expect(page.getByTestId('modos').getByRole('link')).toHaveText([
    'Pesos',
    'Venta o muerte',
    'Novedad',
    'Mover lote',
    'Entrada de ganado',
    'Sanidad',
  ])
})

test('/anotar cae en Pesos', async ({ page }) => {
  await page.goto('/anotar')
  await expect(page).toHaveURL(/\/anotar\/pesos/)
})

test('el modo en el que estás queda marcado, y solo ese', async ({ page }) => {
  await page.goto('/anotar/novedad')
  await expect(page.getByTestId('modos').locator('[aria-current="page"]')).toHaveText(['Novedad'])
})
```

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx playwright test e2e/anotar.spec.ts`
Expected: FAIL — no existe `data-testid="modos"` y `/anotar/novedad` da 404.

- [ ] **Step 3: Escribir el caparazón de Anotar**

`src/app/anotar/ModosAnotar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MODOS = [
  { href: '/anotar/pesos', texto: 'Pesos' },
  { href: '/anotar/salida', texto: 'Venta o muerte' },
  { href: '/anotar/novedad', texto: 'Novedad' },
  { href: '/anotar/mover', texto: 'Mover lote' },
  { href: '/anotar/entrada', texto: 'Entrada de ganado' },
  { href: '/anotar/sanidad', texto: 'Sanidad' },
] as const

export function ModosAnotar() {
  const ruta = usePathname()
  return (
    <div data-testid="modos" className="mt-10 flex w-fit gap-[2px] rounded bg-crema-2 p-[3px]">
      {MODOS.map((modo) => {
        const activo = ruta === modo.href
        return (
          <Link
            key={modo.href}
            href={modo.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-[2px] px-[18px] py-[9px] text-[13.5px] font-semibold no-underline ${
              activo ? 'bg-monte text-crema' : 'text-carbon-3'
            }`}
          >
            {modo.texto}
          </Link>
        )
      })}
    </div>
  )
}
```

`src/app/anotar/layout.tsx`:

```tsx
import { Marco } from '@/ui/Marco'
import { ModosAnotar } from './ModosAnotar'

export default function AnotarLayout({ children }: { children: React.ReactNode }) {
  return (
    <Marco>
      <ModosAnotar />
      {children}
    </Marco>
  )
}
```

Los seis `page.tsx` ponen su propio titular debajo de la cinta de modos, porque cada modo dice algo distinto («Pasa la libreta.», «¿Qué les pusiste?»).

- [ ] **Step 4: Mudar el modo Pesos**

```bash
git mv src/app/digitar/TablaPesaje.tsx src/app/anotar/pesos/TablaPesaje.tsx
git mv src/app/digitar/PesajesRecientes.tsx src/app/anotar/pesos/PesajesRecientes.tsx
git mv src/app/digitar/acciones.ts src/app/anotar/pesos/acciones.ts
```

`src/app/anotar/pesos/page.tsx` toma el contenido de `src/app/digitar/page.tsx`, cambia los `import` a las rutas nuevas, quita su `<Marco>` propio (lo pone el layout) y estrena el titular:

```tsx
<div className="max-w-[820px] pt-8">
  <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
    Pasa la libreta.
  </h1>
  <p className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">
    Escribe de arriba abajo con la tecla Tab. Deja vacías las chapetas que no se pesaron.
  </p>
</div>
```

Dentro de `TablaPesaje` y `PesajesRecientes`, cambiar las clases del sistema viejo por las del v3: `bg-pasto` → `bg-monte`, `text-rojo-tierra` → `text-barro`, `text-ambar` → `text-barro`, `font-serif` → nada. Los encabezados de tabla usan la clase `.rotulo`. **No tocar ninguna otra línea de esos archivos.**

En `revalidatePath` dentro de `src/app/anotar/pesos/acciones.ts`, cambiar `'/digitar'` por `'/anotar/pesos'` y agregar `revalidatePath('/')` — la portada de Ganado muestra el último pesaje y tiene que refrescarse cuando se guarda una tanda.

- [ ] **Step 5: Mudar las pruebas de digitar**

Mover el contenido de `e2e/digitar.spec.ts` al final de `e2e/anotar.spec.ts`, cambiando `page.goto('/digitar')` por `page.goto('/anotar/pesos')`. Borrar `e2e/digitar.spec.ts`.

- [ ] **Step 6: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/anotar.spec.ts && npx tsc --noEmit`
Expected: PASS — las tres nuevas y las cuatro mudadas de digitar, sin cambiarles una sola aserción.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/anotar src/app/digitar e2e
git commit -m "diseño: Anotar reúne los seis modos, empezando por los pesos"
```

---

### Task 7: Anotar — venta, novedad, mover lote y entrada de ganado

**Files:**
- Move: `src/app/salidas/{SalidaForm,SalidasRecientes}.tsx`, `acciones.ts` → `src/app/anotar/salida/`
- Move: `src/app/novedades/{NovedadForm,HistoriaNovedades,SuministrosVigentes}.tsx`, `acciones.ts` → `src/app/anotar/novedad/`
- Move: `src/app/potreros/MoverLoteForm.tsx`, `acciones.ts` → `src/app/anotar/mover/`
- Move: `src/app/lotes/AltaAnimalesForm.tsx`, `acciones.ts` → `src/app/anotar/entrada/`
- Create: los cuatro `page.tsx` correspondientes
- Test: `e2e/anotar.spec.ts` (se le suman las pruebas mudadas)

**Es una mudanza, no una reescritura.** Las cuatro pantallas ya funcionan y sus reglas costaron trabajo: la advertencia por ganancia inverosímil, la casilla única para toda la tanda, el aviso de capacidad del potrero al mover, la chapeta repetida entre activos, el hueco del día de la feria. Nada de eso se toca. Lo que cambia es dónde vive el archivo, su envoltura visual y las rutas de `revalidatePath`.

- [ ] **Step 1: Mudar las pruebas primero, y verlas fallar**

Antes de mover un solo componente, mover las pruebas: llevar el contenido de `e2e/salidas.spec.ts`, `e2e/novedades.spec.ts`, `e2e/mover-lote.spec.ts` y `e2e/lotes.spec.ts` a `e2e/anotar.spec.ts`, cambiando las URLs:

| Antes | Después |
|---|---|
| `/salidas` | `/anotar/salida` |
| `/novedades` | `/anotar/novedad` |
| `/potreros` | `/anotar/mover` |
| `/lotes` | `/anotar/entrada` |

Borrar los cuatro archivos viejos.

Run: `npx playwright test e2e/anotar.spec.ts`
Expected: FAIL — las cuatro rutas nuevas dan 404. Este es el rojo que hay que ver antes de mudar nada.

- [ ] **Step 2: Mudar los cuatro modos**

```bash
git mv src/app/salidas/SalidaForm.tsx src/app/anotar/salida/SalidaForm.tsx
git mv src/app/salidas/SalidasRecientes.tsx src/app/anotar/salida/SalidasRecientes.tsx
git mv src/app/salidas/acciones.ts src/app/anotar/salida/acciones.ts
git mv src/app/novedades/NovedadForm.tsx src/app/anotar/novedad/NovedadForm.tsx
git mv src/app/novedades/HistoriaNovedades.tsx src/app/anotar/novedad/HistoriaNovedades.tsx
git mv src/app/novedades/SuministrosVigentes.tsx src/app/anotar/novedad/SuministrosVigentes.tsx
git mv src/app/novedades/acciones.ts src/app/anotar/novedad/acciones.ts
git mv src/app/potreros/MoverLoteForm.tsx src/app/anotar/mover/MoverLoteForm.tsx
git mv src/app/potreros/acciones.ts src/app/anotar/mover/acciones.ts
git mv src/app/lotes/AltaAnimalesForm.tsx src/app/anotar/entrada/AltaAnimalesForm.tsx
git mv src/app/lotes/acciones.ts src/app/anotar/entrada/acciones.ts
```

`src/app/potreros/acciones.ts` trae **dos** cosas: mover un lote y crear un potrero. La de crear potrero no es de Anotar —es de Finca—, así que se parte: `moverLoteAccion` se queda en `src/app/anotar/mover/acciones.ts` y `crearPotreroAccion` se va a `src/app/finca/acciones.ts` (Tarea 10). Lo mismo con `src/app/lotes/acciones.ts` si trae la creación de lotes además del alta de animales: la creación de lote se queda en el modo Entrada, porque abrir un lote y meterle animales es el mismo acto.

Cada `page.tsx` nuevo toma el contenido del viejo, quita su `<Marco>` (lo pone `anotar/layout.tsx`) y estrena titular:

| Modo | Titular | Bajada |
|---|---|---|
| `salida` | «¿Qué salió?» | «Venta, muerte o robo. El peso de salida es el último peso real del animal.» |
| `novedad` | «¿Qué pasó?» | «Un hecho puntual, o algo que les están dando y sigue vigente hasta que lo cierres.» |
| `mover` | «¿A dónde los pasas?» | «SOFÍA te avisa si el potrero queda cargado, pero no te lo impide: la decisión es tuya.» |
| `entrada` | «¿Qué entró?» | «Abre el lote y mete la planilla completa de una vez. Los pesos raros se avisan antes de guardar.» |

- [ ] **Step 3: Ajustar imports, clases y revalidaciones**

En los cuatro: arreglar los `import` relativos, cambiar las clases del sistema viejo (`bg-pasto`→`bg-monte`, `text-rojo-tierra`/`text-ambar`→`text-barro`, quitar `font-serif`), y en cada `acciones.ts` cambiar el `revalidatePath` de la ruta vieja a la nueva **y agregar `revalidatePath('/')`**: las cuatro cambian lo que muestra la portada de Ganado.

- [ ] **Step 4: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/anotar.spec.ts && npx tsc --noEmit && npm run test`
Expected: PASS — las 3 del caparazón, las 4 de pesos, las 7 de salidas, las 3 de novedades, la de mover y las 3 de lotes. Ninguna aserción cambió: solo la URL.

- [ ] **Step 5: Commit**

```bash
git add -A src/app e2e
git commit -m "diseño: venta, novedad, mover lote y entrada de ganado se mudan a Anotar"
```

---

### Task 8: Anotar — Sanidad, la pantalla que nunca existió

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<marca>_anular_evento_sanitario/migration.sql`
- Modify: `src/datos/sanidad.ts`
- Modify: `src/datos/sanidad.test.ts`
- Create: `src/app/anotar/sanidad/page.tsx`
- Create: `src/app/anotar/sanidad/SanidadForm.tsx`
- Create: `src/app/anotar/sanidad/acciones.ts`
- Test: `e2e/sanidad.spec.ts`

**Por qué esta tarea es distinta a las otras diez.** Las demás mudan o rediseñan algo que ya funciona. Esta construye lo que faltaba: `EventoSanitario` está en el esquema desde el primer día, la ficha del animal los muestra y el respaldo a Excel los exporta, pero **nunca se hizo el formulario para anotar una vacuna**. Los eventos que hay en la base se metieron a mano en la siembra de demo. El aviso «la desparasitación se venció hace 12 días» que sale en la portada no tiene hoy cómo apagarse.

**Interfaces:**
- Consumes: `registrarEvento`, `EventoVista` de `src/datos/sanidad.ts`; `ETIQUETA_TIPO_EVENTO` de `src/ui/etiquetas.ts`; `listarLotes`, `listarAnimalesDeLote`.
- Produces, en `src/datos/sanidad.ts`:

```typescript
/** Los animales a los que se les puede aplicar algo en esa fecha, y por qué no a los demás. */
export type CandidatoAplicacion = {
  animalId: string
  chapeta: string
  aplicable: boolean
  /** Null si es aplicable. Si no: la razón, en español, para mostrarla apagada. */
  razon: string | null
}
export async function candidatosDeAplicacion(loteId: string, fecha: FechaISO): Promise<CandidatoAplicacion[]>

/** La última aplicación de cada tipo en el lote, para la tabla "lo último que les has puesto". */
export async function ultimasAplicaciones(loteId: string, hoy: FechaISO): Promise<AplicacionVista[]>

export type AplicacionVista = {
  /** Agrupa las filas por animal que salieron de un mismo guardado. */
  claveTanda: string
  tipo: TipoEventoSanitario
  producto: string
  dosis: string | null
  fecha: FechaISO
  proximaFecha: FechaISO | null
  aQuienes: string
  vencida: boolean
  animalIds: string[]
}

export async function anularAplicacion(animalIds: string[], claveTanda: string, motivo: string, usuarioId: string): Promise<void>
```

**Decisión: anular, no borrar.** Los pesajes y las novedades ya se anulan en vez de borrarse —queda la fila con su motivo y desaparece de los cálculos—, y el respaldo a Excel exporta lo anulado a propósito. La sanidad tiene que comportarse igual, así que `EventoSanitario` estrena `anuladoEn`, `motivoAnulacion` y `anuladoPorId`, y las tres lecturas (`eventosDeAnimal`, `eventosVencidos`, `ultimasAplicaciones`) filtran `anuladoEn: null`.

**Decisión: una tanda es un grupo de filas, no una fila.** Desde el arreglo de `sanidad.ts`, aplicarle algo a un lote crea una fila por animal. Anular «la desparasitación del 10 de mayo» tiene que anular las catorce a la vez, no una. `claveTanda` es lo que las junta: `${tipo}|${fecha}|${producto}|${loteId ?? animalId}`. No hace falta una columna nueva —esos cuatro campos ya identifican la tanda sin ambigüedad, porque un mismo producto no se aplica dos veces el mismo día al mismo lote.

- [ ] **Step 1: Escribir las pruebas de la capa de datos que fallan**

Agregar a `src/datos/sanidad.test.ts`:

```typescript
describe('candidatosDeAplicacion', () => {
  it('marca aplicable al que ya había entrado y apagado al que no, con la razón', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['050'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-10-01',
      edadEntradaMeses: null,
      pesos: { '050': 160 },
    })

    const candidatos = await candidatosDeAplicacion(loteId, '2026-09-05')
    const recien = candidatos.find((c) => c.chapeta === '050')!
    const viejo = candidatos.find((c) => c.chapeta === '001')!

    expect(viejo.aplicable).toBe(true)
    expect(viejo.razon).toBeNull()
    expect(recien.aplicable).toBe(false)
    expect(recien.razon).toContain('entró')
  })
})

describe('anularAplicacion', () => {
  it('anula la tanda entera, no una sola fila, y apaga su alerta', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['002'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '002': 150 },
    })
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-05',
      producto: 'Ivermectina',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: '2026-10-05',
      notas: null,
      animalId: null,
      loteId,
      registradoPorId: 'u1',
    })

    const antes = await ultimasAplicaciones(loteId, '2026-10-20')
    expect(antes).toHaveLength(1)
    expect(antes[0].vencida).toBe(true)
    expect(antes[0].animalIds).toHaveLength(2)

    await anularAplicacion(antes[0].animalIds, antes[0].claveTanda, 'Se anotó el producto equivocado', 'u1')

    expect(await ultimasAplicaciones(loteId, '2026-10-20')).toHaveLength(0)
    // Y deja de gritar en la portada.
    expect(await eventosVencidos('2026-10-20')).toHaveLength(0)
    // Pero no se borró: sigue en la base para el respaldo a Excel.
    expect(await prisma.eventoSanitario.count()).toBe(2)
  })

  it('anular exige un motivo', async () => {
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-05',
      producto: 'Aftosa',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: null,
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })
    const [aplicacion] = await ultimasAplicaciones(loteId, '2026-09-20')

    await expect(
      anularAplicacion(aplicacion.animalIds, aplicacion.claveTanda, '   ', 'u1'),
    ).rejects.toThrow('motivo')
  })
})

describe('ultimasAplicaciones', () => {
  it('trae una fila por tanda, no una por animal, y dice a cuántos les tocó', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['002', '003'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '002': 150, '003': 150 },
    })
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-05',
      producto: 'Aftosa',
      dosis: '2 ml',
      responsable: 'Joseph',
      proximaFecha: '2027-03-05',
      notas: null,
      animalId: null,
      loteId,
      registradoPorId: 'u1',
    })

    const aplicaciones = await ultimasAplicaciones(loteId, '2026-09-20')

    expect(aplicaciones).toHaveLength(1)
    expect(aplicaciones[0].aQuienes).toBe('Ceba 01 · 3 animales')
  })

  it('una aplicación a un solo animal se nombra por su chapeta', async () => {
    await registrarEvento({
      tipo: 'tratamiento',
      fecha: '2026-09-06',
      producto: 'Oxitetraciclina',
      dosis: '20 ml',
      responsable: 'Joseph',
      proximaFecha: null,
      notas: 'Herida en la pata',
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    const [aplicacion] = await ultimasAplicaciones(loteId, '2026-09-20')
    expect(aplicacion.aQuienes).toBe('Solo 001')
  })
})
```

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx vitest run src/datos/sanidad.test.ts`
Expected: FAIL — «candidatosDeAplicacion is not exported».

- [ ] **Step 3: La migración de anulación**

En `prisma/schema.prisma`, dentro de `model EventoSanitario`, junto a `creadoEn`:

```prisma
  /// Los eventos no se borran, se anulan: igual que los pesajes y las
  /// novedades. La fila sobrevive con su motivo para el respaldo a Excel, y
  /// desaparece de la ficha del animal y de las alertas.
  anuladoEn       DateTime?
  motivoAnulacion String?
  anuladoPorId    String?
```

```bash
npx prisma migrate dev --name anular_evento_sanitario
```

Es una migración aditiva de tres columnas opcionales: no necesita relleno a mano.

- [ ] **Step 4: Escribir las tres funciones**

En `src/datos/sanidad.ts`. Agregar `anuladoEn: null` al `where` de `eventosDeAnimal` y de `eventosVencidos` —si no, anular no apaga nada— y después:

```typescript
export type CandidatoAplicacion = {
  animalId: string
  chapeta: string
  aplicable: boolean
  razon: string | null
}

// `src/datos/` no importaba nada de `src/ui/` hasta ahora. La razón viaja
// escrita en español porque es texto para el dueño, no un código que la
// pantalla tenga que traducir -- y la única lista de esas palabras vive en
// `src/ui/etiquetas.ts`. Es un import de datos a etiquetas, no al revés:
// `etiquetas.ts` no importa nada de `src/datos/`, así que no hay ciclo.
import { ETIQUETA_ESTADO_ANIMAL } from '@/ui/etiquetas'

/**
 * A quiénes se les puede anotar algo en esa fecha. Los que no, salen igual
 * pero apagados y con la razón escrita: el dueño tiene que ver POR QUÉ falta
 * la 015 en la lista, o va a creer que se le perdió un animal.
 */
export async function candidatosDeAplicacion(
  loteId: string,
  fecha: FechaISO,
): Promise<CandidatoAplicacion[]> {
  const animales = await prisma.animal.findMany({
    where: { loteId },
    select: { id: true, chapeta: true, estado: true, fechaEntrada: true, fechaSalida: true },
    orderBy: { chapeta: 'asc' },
  })

  return animales.map((animal) => {
    const entrada = aFechaISO(animal.fechaEntrada)
    if (entrada > fecha) {
      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        aplicable: false,
        razon: `entró a la finca el ${entrada}: ese día no estaba`,
      }
    }
    if (animal.estado !== 'activo') {
      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        aplicable: false,
        razon: `ya salió de la finca (${ETIQUETA_ESTADO_ANIMAL[animal.estado]})`,
      }
    }
    return { animalId: animal.id, chapeta: animal.chapeta, aplicable: true, razon: null }
  })
}

export type AplicacionVista = {
  claveTanda: string
  tipo: TipoEventoSanitario
  producto: string
  dosis: string | null
  fecha: FechaISO
  proximaFecha: FechaISO | null
  aQuienes: string
  vencida: boolean
  animalIds: string[]
}

function claveDeTanda(evento: {
  tipo: string
  fecha: Date
  producto: string
  loteId: string | null
  animalId: string
}): string {
  return `${evento.tipo}|${aFechaISO(evento.fecha)}|${evento.producto}|${evento.loteId ?? evento.animalId}`
}

/**
 * La tabla "lo último que les has puesto": una fila por TANDA, no por animal.
 * Desde que una aplicación de lote deja una fila por animal, mostrarlas sin
 * agrupar llenaría la pantalla con catorce líneas idénticas.
 */
export async function ultimasAplicaciones(loteId: string, hoy: FechaISO): Promise<AplicacionVista[]> {
  const eventos = await prisma.eventoSanitario.findMany({
    where: { anuladoEn: null, animal: { loteId } },
    include: { animal: { select: { chapeta: true } }, lote: { select: { nombre: true } } },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
  })

  const tandas = new Map<string, AplicacionVista>()
  for (const evento of eventos) {
    const clave = claveDeTanda(evento)
    const ya = tandas.get(clave)
    if (ya) {
      ya.animalIds.push(evento.animalId)
      continue
    }
    tandas.set(clave, {
      claveTanda: clave,
      tipo: evento.tipo,
      producto: evento.producto,
      dosis: evento.dosis,
      fecha: aFechaISO(evento.fecha),
      proximaFecha: evento.proximaFecha ? aFechaISO(evento.proximaFecha) : null,
      aQuienes: evento.lote ? evento.lote.nombre : `Solo ${evento.animal.chapeta}`,
      vencida: evento.proximaFecha !== null && aFechaISO(evento.proximaFecha) < hoy,
      animalIds: [evento.animalId],
    })
  }

  return [...tandas.values()].map((tanda) => ({
    ...tanda,
    aQuienes: tanda.animalIds.length > 1 ? `${tanda.aQuienes} · ${tanda.animalIds.length} animales` : tanda.aQuienes,
  }))
}

export async function anularAplicacion(
  animalIds: string[],
  claveTanda: string,
  motivo: string,
  usuarioId: string,
): Promise<void> {
  const motivoLimpio = motivo.trim()
  if (motivoLimpio === '') {
    throw new Error('Anular una aplicación necesita un motivo: explica por qué se anota mal.')
  }

  const [tipo, fecha, producto] = claveTanda.split('|')
  await prisma.eventoSanitario.updateMany({
    where: {
      animalId: { in: animalIds },
      tipo: tipo as TipoEventoSanitario,
      fecha: aFechaDb(fecha),
      producto,
      anuladoEn: null,
    },
    data: { anuladoEn: new Date(), motivoAnulacion: motivoLimpio, anuladoPorId: usuarioId },
  })
}
```

- [ ] **Step 5: Correr las pruebas de datos y verlas pasar**

Run: `npx vitest run src/datos/sanidad.test.ts`
Expected: PASS, las 18 (13 de antes + 5 nuevas).

- [ ] **Step 6: Escribir la prueba de navegador que falla**

Crear `e2e/sanidad.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { entrar, sembrarLoteConPesajes } from './preparar'

test.beforeEach(async ({ page }) => {
  await sembrarLoteConPesajes()
  await entrar(page)
  await page.goto('/anotar/sanidad')
})

test('anotar una vitamina a todo el lote deja una anotación por animal', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('vitamina')
  await page.getByLabel('Producto').fill('Complejo B')
  await page.getByLabel('Dosis').fill('5 ml')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel(/Todo Ceba 01/).check()

  // El resumen dice exactamente qué va a pasar antes de guardar.
  await expect(page.getByTestId('resumen')).toContainText('14 anotaciones')

  await page.getByRole('button', { name: /Guardar/ }).click()

  await expect(page.getByTestId('ultimas')).toContainText('Complejo B')
  await expect(page.getByTestId('ultimas')).toContainText('14 animales')
})

test('se puede aplicar solo a unas chapetas sueltas', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('tratamiento')
  await page.getByLabel('Producto').fill('Oxitetraciclina')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel('Solo algunos').check()
  await page.getByRole('checkbox', { name: '001' }).check()

  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect(page.getByTestId('ultimas')).toContainText('Solo 001')
})

test('un animal que no había entrado sale apagado y con la razón', async ({ page }) => {
  await page.getByLabel('Fecha').fill('2026-01-01')
  await page.getByLabel('Solo algunos').check()

  const fuera = page.getByTestId('candidato-fuera').first()
  await expect(fuera).toContainText('entró a la finca')
  await expect(fuera.getByRole('checkbox')).toBeDisabled()
})

test('sin producto no se guarda, y no se pierde lo ya escrito', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('vacuna')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel(/Todo Ceba 01/).check()
  await page.getByRole('button', { name: /Guardar/ }).click()

  await expect(page.getByRole('alert')).toContainText('producto')
  await expect(page.getByLabel('Quién lo aplicó')).toHaveValue('Joseph')
})

test('anular una tanda la saca de la lista y apaga su aviso en Ganado', async ({ page }) => {
  await page.getByLabel('Qué se aplicó').selectOption('desparasitacion')
  await page.getByLabel('Producto').fill('Ivermectina')
  await page.getByLabel('Quién lo aplicó').fill('Joseph')
  await page.getByLabel('Vuelve a tocar el').fill('2020-01-01')
  await page.getByLabel(/Todo Ceba 01/).check()
  await page.getByRole('button', { name: /Guardar/ }).click()

  await page.goto('/')
  await expect(page.getByTestId('avisos')).toContainText('Ivermectina')

  await page.goto('/anotar/sanidad')
  await page.getByRole('button', { name: 'Anular' }).first().click()
  await page.getByLabel('Motivo').fill('Se anotó el producto equivocado')
  await page.getByRole('button', { name: 'Anular la aplicación' }).click()

  await expect(page.getByTestId('ultimas')).not.toContainText('Ivermectina')
  await page.goto('/')
  await expect(page.getByTestId('avisos')).not.toContainText('Ivermectina')
})
```

- [ ] **Step 7: Correr la prueba y verla fallar**

Run: `npx playwright test e2e/sanidad.spec.ts`
Expected: FAIL — `/anotar/sanidad` da 404.

- [ ] **Step 8: Escribir la acción de servidor**

`src/app/anotar/sanidad/acciones.ts`, siguiendo el patrón de `src/app/anotar/novedad/acciones.ts` (que devuelve el estado con `datosEnviados` para repoblar el formulario tras un rechazo):

```typescript
'use server'

import type { TipoEventoSanitario } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { anularAplicacion, registrarEvento } from '@/datos/sanidad'

export type DatosSanidadEnviados = {
  tipo: string
  producto: string
  dosis: string
  fecha: string
  responsable: string
  proximaFecha: string
  notas: string
  alcance: 'lote' | 'algunos'
  loteId: string
  animalIds: string[]
}

export type EstadoSanidad = {
  guardadas: number | null
  datosEnviados: DatosSanidadEnviados | null
  error: string | null
}

export async function registrarSanidadAccion(
  _estado: EstadoSanidad,
  datos: FormData,
): Promise<EstadoSanidad> {
  const usuario = await usuarioActual()
  const enviados: DatosSanidadEnviados = {
    tipo: String(datos.get('tipo') ?? ''),
    producto: String(datos.get('producto') ?? ''),
    dosis: String(datos.get('dosis') ?? ''),
    fecha: String(datos.get('fecha') ?? ''),
    responsable: String(datos.get('responsable') ?? ''),
    proximaFecha: String(datos.get('proximaFecha') ?? ''),
    notas: String(datos.get('notas') ?? ''),
    alcance: datos.get('alcance') === 'algunos' ? 'algunos' : 'lote',
    loteId: String(datos.get('loteId') ?? ''),
    animalIds: datos.getAll('animalIds').map(String),
  }

  // Se valida aquí y no solo en el navegador: el `required` del HTML no
  // protege contra una petición hecha a mano, y una vacuna sin producto es
  // un récord que no sirve para nada.
  if (enviados.producto.trim() === '') {
    return { guardadas: null, datosEnviados: enviados, error: 'Escribe qué producto se aplicó.' }
  }
  if (enviados.responsable.trim() === '') {
    return { guardadas: null, datosEnviados: enviados, error: 'Escribe quién lo aplicó.' }
  }
  if (enviados.alcance === 'algunos' && enviados.animalIds.length === 0) {
    return { guardadas: null, datosEnviados: enviados, error: 'Marca al menos una chapeta.' }
  }

  try {
    const comun = {
      tipo: enviados.tipo as TipoEventoSanitario,
      fecha: enviados.fecha,
      producto: enviados.producto.trim(),
      dosis: enviados.dosis.trim() || null,
      responsable: enviados.responsable.trim(),
      proximaFecha: enviados.proximaFecha || null,
      notas: enviados.notas.trim() || null,
      registradoPorId: usuario.id,
    }

    if (enviados.alcance === 'lote') {
      await registrarEvento({ ...comun, animalId: null, loteId: enviados.loteId })
    } else {
      // Una llamada por animal marcado: `registrarEvento` con `animalId`
      // escribe una sola fila, que es justo lo que se quiere aquí.
      for (const animalId of enviados.animalIds) {
        await registrarEvento({ ...comun, animalId, loteId: null })
      }
    }
  } catch (error) {
    return {
      guardadas: null,
      datosEnviados: enviados,
      error: error instanceof Error ? error.message : 'No se pudo guardar la aplicación.',
    }
  }

  revalidatePath('/anotar/sanidad')
  revalidatePath('/')
  return { guardadas: enviados.alcance === 'lote' ? -1 : enviados.animalIds.length, datosEnviados: null, error: null }
}

export async function anularSanidadAccion(_estado: { error: string | null }, datos: FormData) {
  const usuario = await usuarioActual()
  try {
    await anularAplicacion(
      datos.getAll('animalIds').map(String),
      String(datos.get('claveTanda')),
      String(datos.get('motivo') ?? ''),
      usuario.id,
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo anular.' }
  }
  revalidatePath('/anotar/sanidad')
  revalidatePath('/')
  return { error: null }
}
```

`hoyBogota()` se usa para el valor por defecto de la fecha en el formulario, no aquí.

- [ ] **Step 9: Escribir la pantalla**

`src/app/anotar/sanidad/page.tsx` (servidor) lee el lote de `?lote=`, llama `candidatosDeAplicacion(lote.id, fecha)` y `ultimasAplicaciones(lote.id, hoy)`, y pasa todo a `SanidadForm`.

`src/app/anotar/sanidad/SanidadForm.tsx` (cliente, con `useActionState`) arma:

1. **El titular:** «¿Qué les pusiste?» / «Queda guardado novillo por novillo, con el producto y la dosis. Si pones cuándo toca repetirlo, SOFÍA te avisa en Ganado cuando se venza.»
2. **Los seis campos en una fila que envuelve:** Qué se aplicó (`select` con las cuatro opciones de `ETIQUETA_TIPO_EVENTO`, nunca los valores crudos del enum), Producto, Dosis (con la nota «Por animal»), Fecha (por defecto hoy), Quién lo aplicó, Vuelve a tocar el (con la nota «Déjalo vacío si no se repite»).
3. **«¿A cuáles?»** — dos radios: «Todo [lote] · N animales» o «Solo algunos». Con el segundo se muestran las casillas de chapeta. Los no aplicables van deshabilitados, con `data-testid="candidato-fuera"` y la razón visible.
4. **El resumen antes de guardar**, con `data-testid="resumen"`: «Se guardan **14 anotaciones**, una por novillo, no una del lote. Así el récord de cada animal lo sigue a donde lo muevas y no se pierde cuando lo vendas.» El número se recalcula solo cuando cambia la selección o la fecha.
5. **«Lo último que les has puesto»**, con `data-testid="ultimas"`: la tabla de `ultimasAplicaciones`, la vencida en barro, con «Anular» al final de cada fila.

Cambiar la fecha vuelve a pedir los candidatos: es un `<form>` con `method="GET"` sobre el mismo `page.tsx` para el campo de fecha, o un `router.replace` con `?fecha=`. **No** filtrar los candidatos en el cliente: quién había entrado en una fecha es una pregunta de la base, no del navegador.

- [ ] **Step 10: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/sanidad.spec.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS las cinco de navegador y las 18 de datos.

- [ ] **Step 11: Commit**

```bash
git add prisma src/datos/sanidad.ts src/datos/sanidad.test.ts src/app/anotar/sanidad e2e/sanidad.spec.ts
git commit -m "feat: la pantalla para anotar vacunas, desparasitaciones y tratamientos"
```

---

### Task 9: La ficha del animal como línea de tiempo

**Files:**
- Create: `src/datos/linea-de-tiempo.ts`
- Test: `src/datos/linea-de-tiempo.test.ts`
- Modify: `src/app/animales/[id]/page.tsx`
- Test: `e2e/animal.spec.ts`

**Interfaces:**
- Consumes: `historialDeAnimal`, `eventosDeAnimal`, `gdpEntre`, `gdpAcumulada`, `diasEntre`.
- Produces:

```typescript
export type Suceso = {
  fecha: FechaISO
  clase: 'entrada' | 'pesaje' | 'sanidad' | 'movimiento' | 'salida'
  /** La línea principal: "Pesaje con cinta", "Desparasitación del lote · Ivermectina 1%". */
  que: string
  /** La línea chica de abajo: quién, la dosis, la próxima fecha. Null si no hay nada que agregar. */
  detalle: string | null
  /** La cifra de la derecha, si el suceso trae una: "205,0 kg". Null si no. */
  cifra: string | null
  /** La cifra chica bajo la anterior: "300 g/día". Null si no. */
  cifraChica: string | null
  /** Enciende el suceso en barro: un pesaje por debajo del umbral bajo. */
  malo: boolean
}

export async function lineaDeTiempoDeAnimal(animalId: string, hoy: FechaISO): Promise<Suceso[]>
```

Devuelve **de lo más reciente a lo más viejo**, que es como lo lee el dueño: lo último que pasó primero. Los movimientos son del lote, no del animal, así que se traen de `Movimiento` filtrando por el lote del animal y por fechas dentro de su estadía —un movimiento de antes de que entrara no le pasó a él.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/datos/linea-de-tiempo.test.ts` con estos cuatro casos, montados sobre el mismo `beforeEach` de `src/datos/sanidad.test.ts` (crear finca, lote, un animal con chapeta '001' que entra el 2026-09-01 con 150 kg):

1. **La entrada siempre es el último suceso de la lista.** `lineaDeTiempoDeAnimal(animalId, hoy)` con nada más registrado devuelve exactamente un suceso, de clase `'entrada'`, con `cifra` `'150,0 kg'`.
2. **Un pesaje aparece con su ganancia diaria contra el pesaje anterior.** Tras dos tandas (2026-10-01 a 180 kg y 2026-11-01 a 210 kg), el primer suceso de la lista es el del 2026-11-01 con `cifra` `'210,0 kg'` y `cifraChica` `'968 g/día'` (30 kg en 31 días).
3. **Una aplicación sanitaria aparece con su producto y su próxima fecha.** Tras `registrarEvento` de una desparasitación con `proximaFecha`, hay un suceso de clase `'sanidad'` cuyo `detalle` contiene el nombre del producto y la próxima fecha.
4. **Los sucesos vienen de lo más nuevo a lo más viejo.** Con entrada, pesaje y sanidad registrados en fechas distintas, `sucesos.map(s => s.fecha)` está ordenado descendente.

Escribir los cuatro con aserciones exactas —no `expect(x).toBeTruthy()`—, siguiendo el estilo del resto de `src/datos/*.test.ts`.

- [ ] **Step 2: Correr las pruebas y verlas fallar**

Run: `npx vitest run src/datos/linea-de-tiempo.test.ts`
Expected: FAIL — «Failed to resolve import "./linea-de-tiempo"».

- [ ] **Step 3: Escribir la implementación**

`src/datos/linea-de-tiempo.ts` junta cuatro consultas y las mezcla en un solo orden:

- **Entrada:** de `Animal.fechaEntrada` y `pesoEntradaKg`. Detalle: el proveedor, si lo hay.
- **Pesajes:** `historialDeAnimal(animalId)`; para cada uno, `gdpEntre` contra el anterior (o `gdpAcumulada` contra la entrada, para el primero). `malo` sale de comparar contra `leerUmbrales(hoy).bajo`.
- **Sanidad:** `eventosDeAnimal(animalId)`. El `que` sale de `ETIQUETA_TIPO_EVENTO[evento.tipo]` más el producto; si el evento trae lote, se dice «del lote». El detalle junta dosis, notas y próxima fecha con « · ».
- **Movimientos:** los del lote del animal, entre su entrada y su salida (o hoy). `que`: «El lote pasó de [origen] a [destino]».
- **Salida:** si el animal no está activo, un suceso con su estado en español y su peso de salida.

Todo ordenado por fecha descendente. La conversión de `Date` a `FechaISO` ocurre solo aquí, nunca en la pantalla.

- [ ] **Step 4: Correr las pruebas y verlas pasar**

Run: `npx vitest run src/datos/linea-de-tiempo.test.ts`
Expected: PASS, las cuatro.

- [ ] **Step 5: Escribir la prueba de navegador que falla**

Crear `e2e/animal.spec.ts`:

```typescript
import { expect, test } from '@playwright/test'
import { entrar, sembrarLoteConPesajes } from './preparar'

test.beforeEach(async ({ page }) => {
  await sembrarLoteConPesajes()
  await entrar(page)
  await page.goto('/')
  await page.getByTestId('tarja').first().click()
})

test('la ficha abre con la chapeta, la cinta de cuatro cifras y la vuelta al ganado', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText(/^\d+$/)
  await expect(page.getByTestId('cinta')).toContainText('Peso actual')
  await expect(page.getByTestId('cinta')).toContainText('Ganancia diaria')
  await expect(page.getByRole('link', { name: /El ganado/ })).toHaveAttribute('href', '/')
})

test('la línea de tiempo empieza por lo último que pasó y termina en la entrada', async ({ page }) => {
  const sucesos = page.getByTestId('suceso')
  await expect(sucesos.last()).toContainText('Entró a la finca')
})

test('desde la ficha se llega a anotarle el peso y a registrar su salida', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Anotar su peso' })).toHaveAttribute('href', /\/anotar\/pesos/)
  await expect(page.getByRole('link', { name: 'Registrar su salida' })).toHaveAttribute('href', /\/anotar\/salida/)
})
```

- [ ] **Step 6: Reescribir la ficha**

`src/app/animales/[id]/page.tsx`: el encabezado con la chapeta grande y su renglón de datos (lote, raza, sexo, cuándo entró y con cuánto, proveedor, edad al entrar); el sello «No está engordando» solo si su clasificación es `bajo` o `critico`; la `<Cinta>` con Peso actual, Ha ganado, Ganancia diaria y Días en finca; la `<GraficaLote>` reusada con la serie del animal —**no** la del lote— contra su propia trayectoria objetivo; la línea de tiempo; y los dos botones del pie.

La gráfica del animal necesita una serie de un solo animal. En vez de escribir una función nueva, `serieDePesoPromedio` sirve tal cual si se le pasa un lote de un solo animal — pero eso es forzarla. Extraer en su lugar `serieDeAnimal(animalId, hoy): Promise<SerieLote>` en `src/datos/serie.ts`, que arma los puntos desde `historialDeAnimal` y calcula el objetivo con los días desde la entrada de ese animal. Es diez líneas y no ensucia la del lote.

- [ ] **Step 7: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/animal.spec.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/datos/linea-de-tiempo.ts src/datos/linea-de-tiempo.test.ts src/datos/serie.ts src/app/animales e2e/animal.spec.ts
git commit -m "diseño: la ficha del animal cuenta todo lo que le ha pasado en una sola línea"
```

---

### Task 10: La finca

**Files:**
- Modify: `src/app/finca/page.tsx`
- Create: `src/app/finca/TarjetaPotrero.tsx`
- Create: `src/app/finca/FilaCriterio.tsx`
- Create: `src/app/finca/acciones.ts` (recibe `crearPotreroAccion` de la Tarea 7 y las acciones de `src/app/configuracion/acciones.ts`)
- Move: `src/app/configuracion/FormularioParametro.tsx` → `src/app/finca/FormularioParametro.tsx`
- Move: `src/app/configuracion/definiciones.ts` y `definiciones.test.ts` → `src/app/finca/`
- Test: `e2e/finca.spec.ts`

**Tres bloques, en este orden:** los potreros, los criterios y la copia de todo.

**Los potreros** son tarjetas: nombre, hectáreas, pasto, si tiene agua; estado («Ocupado · Ceba 01» o «Descansando»); los días —de ocupación o de descanso— y los kg encima; y una barra de carga contra la capacidad del potrero, que se pone barro cuando está sobrecargado. Debajo, «Agregar un potrero». **Mover un lote no se hace aquí**: eso es Anotar → Mover lote, porque es una anotación del día a día, no una propiedad de la finca.

**Los criterios** son la vieja `/configuracion` con otra cara: una fila por parámetro con qué gobierna, su valor vigente, «Cambiar» y «Historial». La nota de arriba explica lo único que hay que entender: «Cambiarlos no reescribe el pasado: cada valor queda con la fecha desde la que rige.» Toda la lógica de vigencias, validación y advertencias de `src/app/configuracion/` se mantiene intacta.

**La copia de todo** es el botón de `/exportar` con el texto que explica qué es: la salida del dueño. La ruta `/exportar` no cambia.

- [ ] **Step 1: Mudar las pruebas y verlas fallar**

Llevar `e2e/configuracion.spec.ts` y `e2e/potreros.spec.ts` a `e2e/finca.spec.ts` cambiando las URLs a `/finca`, y agregar:

```typescript
test('los tres bloques de la finca están, en orden', async ({ page }) => {
  await page.goto('/finca')
  await expect(page.locator('h2')).toHaveText(['Los potreros', 'Los criterios de la finca', 'Tu copia de todo'])
})

test('un potrero ocupado dice qué lote tiene encima y hace cuántos días', async ({ page }) => {
  await page.goto('/finca')
  const ocupado = page.getByTestId('potrero').filter({ hasText: 'Ocupado' }).first()
  await expect(ocupado).toContainText('días')
  await expect(ocupado).toContainText('kg encima')
})

test('cada criterio muestra su valor vigente y ofrece cambiarlo y ver su historial', async ({ page }) => {
  await page.goto('/finca')
  const criterio = page.getByTestId('criterio').first()
  await expect(criterio.getByRole('link', { name: 'Historial' })).toBeVisible()
  await expect(criterio.getByRole('button', { name: 'Cambiar' })).toBeVisible()
})

test('el botón de la copia baja un archivo de verdad', async ({ page }) => {
  await page.goto('/finca')
  const descarga = page.waitForEvent('download')
  await page.getByRole('link', { name: /Bajar todo a Excel/ }).click()
  expect((await descarga).suggestedFilename()).toMatch(/\.xlsx$/)
})
```

Borrar `e2e/configuracion.spec.ts` y `e2e/potreros.spec.ts`.

Run: `npx playwright test e2e/finca.spec.ts`
Expected: FAIL — `/finca` solo dice «La finca».

- [ ] **Step 2: Mudar la configuración**

```bash
git mv src/app/configuracion/FormularioParametro.tsx src/app/finca/FormularioParametro.tsx
git mv src/app/configuracion/definiciones.ts src/app/finca/definiciones.ts
git mv src/app/configuracion/definiciones.test.ts src/app/finca/definiciones.test.ts
git mv src/app/configuracion/acciones.ts src/app/finca/acciones.ts
```

Agregar `crearPotreroAccion` a `src/app/finca/acciones.ts`, sacándola de donde quedó en la Tarea 7.

- [ ] **Step 3: Escribir los dos componentes y la pantalla**

`src/app/finca/TarjetaPotrero.tsx` — la tarjeta descrita arriba, con `data-testid="potrero"`. Un potrero descansando va sobre `bg-crema` (más apagado) y uno ocupado sobre `bg-crema-2`; la barra usa `evaluarCapacidad` de `src/calc/potrero.ts` para decidir si va en barro.

`src/app/finca/FilaCriterio.tsx` — la fila de criterio, con `data-testid="criterio"`, envolviendo el `FormularioParametro` que ya existe.

`src/app/finca/page.tsx` — el titular («Santa Verónica · 35 hectáreas útiles», con el nombre y las hectáreas leídos de la base, nunca escritos), los tres bloques, y **sin** el pie con el nombre completo (va solo en Ganado).

- [ ] **Step 4: Correr las pruebas y verlas pasar**

Run: `npx playwright test e2e/finca.spec.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS — las cuatro nuevas y todas las mudadas de configuración y potreros.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/finca src/app/configuracion e2e
git commit -m "diseño: la Finca reúne los potreros, los criterios y la copia de todo"
```

---

### Task 11: Borrar lo viejo, redirigir y recorrer la plataforma entera

**Files:**
- Delete: `src/app/como-vamos/`, `src/app/digitar/`, `src/app/salidas/`, `src/app/novedades/`, `src/app/lotes/`, `src/app/potreros/`, `src/app/configuracion/`
- Create: `src/app/como-vamos/page.tsx`, `src/app/digitar/page.tsx`, `src/app/salidas/page.tsx`, `src/app/novedades/page.tsx`, `src/app/lotes/page.tsx`, `src/app/potreros/page.tsx`, `src/app/configuracion/page.tsx` — solo redirecciones
- Modify: `src/app/globals.css` (borrar los alias de transición)
- Modify: `src/app/error.tsx`, `src/app/entrar/page.tsx`, `src/ui/Cifra.tsx`, `src/ui/Semaforo.tsx`
- Test: `e2e/recorrido.spec.ts`

- [ ] **Step 1: Escribir la prueba del recorrido completo, que falla**

Crear `e2e/recorrido.spec.ts` — es la prueba que demuestra que no se perdió ninguna función:

```typescript
import { expect, test } from '@playwright/test'
import { entrar, sembrarLoteConPesajes } from './preparar'

test.beforeEach(async ({ page }) => {
  await sembrarLoteConPesajes()
  await entrar(page)
})

const REDIRECCIONES = [
  ['/como-vamos', '/'],
  ['/digitar', '/anotar/pesos'],
  ['/salidas', '/anotar/salida'],
  ['/novedades', '/anotar/novedad'],
  ['/lotes', '/anotar/entrada'],
  ['/potreros', '/anotar/mover'],
  ['/configuracion', '/finca'],
] as const

for (const [vieja, nueva] of REDIRECCIONES) {
  test(`${vieja} lleva a ${nueva}`, async ({ page }) => {
    await page.goto(vieja)
    await expect(page).toHaveURL(new RegExp(`${nueva.replace('/', '\\/')}$`))
  })
}

test('desde Ganado se llega a todo en dos clics', async ({ page }) => {
  await page.goto('/')
  for (const modo of ['Pesos', 'Venta o muerte', 'Novedad', 'Mover lote', 'Entrada de ganado', 'Sanidad']) {
    await page.getByRole('link', { name: 'Anotar', exact: true }).click()
    await page.getByTestId('modos').getByRole('link', { name: modo }).click()
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
})

test('ninguna pantalla deja escapar un valor crudo de enum', async ({ page }) => {
  const crudos = /\b(ceba|levante|leche|cinta|bascula|desparasitacion|vendido|robado|suministro)\b/
  for (const ruta of ['/', '/anotar/pesos', '/anotar/salida', '/anotar/sanidad', '/finca']) {
    await page.goto(ruta)
    await expect(page.locator('body')).not.toContainText(crudos)
  }
})

test('el respaldo a Excel sigue trayendo las ocho hojas después del rediseño', async ({ page }) => {
  await page.goto('/finca')
  const descarga = page.waitForEvent('download')
  await page.getByRole('link', { name: /Bajar todo a Excel/ }).click()
  expect((await descarga).suggestedFilename()).toMatch(/\.xlsx$/)
})
```

- [ ] **Step 2: Correr la prueba y verla fallar**

Run: `npx playwright test e2e/recorrido.spec.ts`
Expected: FAIL — `/como-vamos` todavía renderiza la pantalla vieja en vez de redirigir.

- [ ] **Step 3: Borrar las pantallas viejas y dejar las redirecciones**

```bash
git rm -r src/app/como-vamos src/app/digitar src/app/salidas src/app/novedades src/app/lotes src/app/potreros src/app/configuracion
```

Y crear siete archivos de una línea. Por ejemplo `src/app/digitar/page.tsx`:

```tsx
import { permanentRedirect } from 'next/navigation'

// El dueño tiene enlaces guardados en el navegador desde antes del rediseño.
// Una redirección permanente cuesta un archivo de tres líneas; un 404 le
// cuesta a él encontrar de nuevo dónde quedó la pantalla.
export default function Digitar() {
  permanentRedirect('/anotar/pesos')
}
```

Los otros seis, iguales, con su destino de la tabla del Paso 1.

- [ ] **Step 4: Barrer los últimos restos del sistema viejo**

Borrar de `src/app/globals.css` el bloque de «Alias de transición» (`--color-pasto`, `--color-pasto-medio`, `--color-ambar`, `--color-rojo-tierra`) y el alias `--font-serif`.

Run: `npx tsc --noEmit && npx next build`

El build va a señalar cada clase que todavía apunta a un token borrado. Arreglar los cuatro archivos que quedan (`src/app/error.tsx`, `src/app/entrar/page.tsx`, `src/ui/Cifra.tsx`, `src/ui/Semaforo.tsx`): `bg-pasto`→`bg-monte`, `text-rojo-tierra`/`text-ambar`→`text-barro`, quitar `font-serif`.

`Semaforo.tsx` merece una mirada aparte: hoy pinta cinco clasificaciones con cinco colores. El sistema v3 solo tiene dos colores de estado. Reducirlo a barro (bajo y crítico), monte (excelente) y tinta (bueno, normal, sin dato) —**la clasificación completa se sigue diciendo con palabras**, que es lo que un daltónico lee de todos modos.

- [ ] **Step 5: Verificar que no quedó nada del sistema viejo**

```bash
grep -rn "pasto-medio\|rojo-tierra\|text-ambar\|bg-ambar\|font-serif" src/ && echo "QUEDAN RESTOS" || echo "limpio"
grep -rn "'/digitar'\|'/salidas'\|'/novedades'\|'/lotes'\|'/potreros'\|'/configuracion'\|'/como-vamos'" src/ --include='*.tsx' --include='*.ts' | grep -v "permanentRedirect"
```

El primero tiene que decir «limpio». El segundo no debe traer ninguna línea: si trae, es un `revalidatePath` o un `<Link>` apuntando a una ruta que ya no existe.

- [ ] **Step 6: Verificar función por función contra la tabla**

Recorrer a mano y marcar. Es el chequeo que la promesa «ninguna función se pierde» exige:

- [ ] Ver la ganancia diaria de cada animal y del lote → Ganado
- [ ] Cambiar el periodo contra el que se mide (30/60/90/acumulado) → filtro «Desde»
- [ ] Ver kg ganados, días en finca y ganancia acumulada → vista «Tabla»
- [ ] Ver los animales que ya salieron → chip «Ya salieron»
- [ ] Ver la frescura de los datos («pesaste hace N días») → bajada del titular
- [ ] Ver los eventos sanitarios vencidos → avisos del titular
- [ ] Ver qué están recibiendo ahora → avisos del titular
- [ ] Digitar una tanda de pesos con revisión previa → Anotar · Pesos
- [ ] Anular una tanda de pesos → Anotar · Pesos
- [ ] Registrar venta, muerte o robo con peso de salida → Anotar · Venta o muerte
- [ ] Anotar un hecho puntual y un suministro vigente → Anotar · Novedad
- [ ] Cerrar un suministro y anular una novedad → Anotar · Novedad
- [ ] Mover un lote de potrero con aviso de capacidad → Anotar · Mover lote
- [ ] Abrir un lote y dar de alta animales con planilla → Anotar · Entrada de ganado
- [ ] Anotar una vacuna, desparasitación, vitamina o tratamiento → Anotar · Sanidad **(nuevo)**
- [ ] Ver y crear potreros → Finca
- [ ] Cambiar un criterio y ver su historial → Finca
- [ ] Bajar el respaldo completo a Excel → Finca
- [ ] Ver la ficha de un animal con su curva y su historia → `/animales/[id]`
- [ ] Entrar y salir de la plataforma → `/entrar`

- [ ] **Step 7: La suite entera, en frío**

```bash
npx tsc --noEmit
npm run test
npm run test:e2e
npx next build
```

Los cuatro tienen que pasar. `npm run test` en frío ordena los archivos por tamaño y saca a la luz cualquier hueco de limpieza entre suites —correrlo así es parte de la verificación, no un detalle.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "diseño: se retiran las nueve pantallas viejas y sus rutas quedan redirigidas"
```

---

## Notas de verificación

**El respaldo a Excel y la anulación de sanidad.** `src/datos/exportacion.ts` exporta los eventos sanitarios y ya exporta lo anulado a propósito en pesajes y novedades. Al agregar `anuladoEn`, `motivoAnulacion` y `anuladoPorId` a `EventoSanitario` (Tarea 8), agregar esas tres columnas a `FilaEventoExport` y a la hoja correspondiente de `construirLibro.ts`, con su prueba en `src/datos/exportacion.test.ts`. Sin eso, el respaldo miente por omisión: dice que se aplicó algo que se anuló.

**El pie con el nombre completo.** El mockup lo repite en las cinco páginas porque cada archivo HTML es independiente. En la plataforma va solo al pie de Ganado —lo dice la restricción global, y repetirlo en tres destinos lo vuelve decoración—. Si al verlo en pantalla se siente que Anotar y Finca quedan sin cierre, la respuesta es un pie más chico y distinto (la fecha del último respaldo, por ejemplo), no repetir el nombre.

**Lo que este plan no toca.** Ninguna función de `src/calc/`. Ninguna regla de validación. El esquema solo crece en tres columnas de anulación. Si al implementar aparece la tentación de «ya que estamos» cambiar una fórmula o un umbral, no: es otro cambio, con otras pruebas, y mezclarlo aquí hace imposible saber si el rediseño rompió algo.

## Qué queda fuera de este plan

| Del diseño | Plan |
|---|---|
| Gastos, categorías, fijos y variables | 3 |
| Compras y ventas de ganado con plata | 3 |
| Costo real de entrada por animal | 3 |
| Costo directo y total por kilogramo producido | 3 |
| Cobertura de las dos metas | 3 |
| Exposición de caja | 3 |
| Punto de equilibrio en sus cuatro formas | 3 |
| Recordatorios de gastos recurrentes | 3 |
| Bloque de plata en la portada de Ganado | 3 |
| Comparador por característica | 4 |
| Simulador financiero | 4 |
| Proyección de fecha de venta en pantalla | 4 |

`Animal.costoEntradaCop` ya existe en el esquema con `@default(0)` esperando al plan 3. Este plan no lo llena ni lo muestra.
