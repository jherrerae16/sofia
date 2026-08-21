# SOFÍA — Plan 1: Fundación y engorde

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar una plataforma web privada donde se registren animales chapeteados, pesajes de cadencia libre y movimientos entre potreros, y que muestre la ganancia diaria de peso individual y promedio con datos auditables.

**Architecture:** Una sola aplicación Next.js que sirve interfaz y datos. Los cálculos viven en módulos puros de `src/calc/` sin importar Prisma ni React — reciben números y devuelven números, y son la única parte del sistema con cobertura de pruebas exhaustiva. El acceso a datos vive en `src/datos/`, separado de las pantallas. Las fechas cruzan la frontera de la base de datos como cadenas `YYYY-MM-DD`, nunca como objetos `Date`, para que ningún cálculo de días dependa de la zona horaria.

**Tech Stack:** Next.js 15 (App Router), TypeScript en modo estricto, Tailwind CSS v4, Prisma con PostgreSQL, Vitest para pruebas unitarias, Playwright para extremo a extremo, Auth.js v5 con credenciales.

## Global Constraints

- **Nombre de la plataforma:** SOFÍA. Aparece completo una sola vez, al pie de la pantalla Hoy: *"SOFÍA — por Sofanor Echeverría."*
- **Nada hardcodeado salvo las fórmulas.** Umbrales, capacidades, hectáreas, GDP objetivo y tipos de lote se leen de la base de datos, nunca de constantes en el código.
- **Los módulos de `src/calc/` no importan Prisma, React, ni nada de Next.js.** Reciben datos planos.
- **Las fechas se manejan como `FechaISO` (`'YYYY-MM-DD'`) en toda la lógica.** La conversión desde y hacia `Date` ocurre solo en `src/datos/`.
- **El dinero se guarda como entero en pesos colombianos.** Sin decimales, sin flotantes.
- **Los pesos se guardan en kg con un decimal.**
- **Nada se borra.** Los registros se anulan con motivo y permanecen visibles.
- **Todo promedio muestra su n.** Nunca un promedio desnudo.
- **Real y proyectado se distinguen por tratamiento visual explícito**, no solo por color.
- **Cada indicador es clickeable** y lleva a los registros que lo produjeron.
- **Paleta obligatoria:** verde pasto profundo `#1B5E3F`, verde medio `#2E8B57`, verde claro `#A8D5BA`, tierra `#8B5E3C`, crema `#F7F4EC`, carbón `#23201B`, ámbar `#D98324`, rojo tierra `#A63D40`.
- **Cifras tabulares obligatorias** en toda columna de números (`font-variant-numeric: tabular-nums`).
- Cada tarea termina con un commit. Los mensajes de commit se escriben en español, en modo normal, sin abreviar.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/calc/tipos.ts` | Tipos compartidos por todos los cálculos |
| `src/calc/fechas.ts` | Aritmética de fechas sobre `FechaISO` |
| `src/calc/gdp.ts` | Ganancia diaria de peso individual |
| `src/calc/clasificacion.ts` | Semáforo de desempeño según umbrales |
| `src/calc/lote.ts` | Promedios de lote con n |
| `src/calc/produccion.ts` | Kilos producidos |
| `src/calc/potrero.ts` | Carga animal, ocupación y descanso |
| `src/calc/proyeccion.ts` | Peso futuro y días a peso objetivo |
| `src/calc/validacion.ts` | Reglas de rechazo y advertencia |
| `prisma/schema.prisma` | Esquema de datos |
| `prisma/seed.ts` | Parámetros iniciales |
| `src/datos/*.ts` | Acceso a base de datos, un archivo por entidad |
| `src/app/**` | Pantallas |
| `src/ui/**` | Componentes compartidos |

---

## Task 1: Andamio del proyecto y primer cálculo de fechas

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- Create: `src/calc/tipos.ts`
- Create: `src/calc/fechas.ts`
- Test: `src/calc/fechas.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `type FechaISO = string`; `diasEntre(desde: FechaISO, hasta: FechaISO): number`; `sumarDias(fecha: FechaISO, dias: number): FechaISO`; `hoyBogota(): FechaISO`

- [ ] **Step 1: Crear el proyecto**

```bash
cd /Users/jdh/sofia
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --use-npm --yes
npm install -D vitest @vitest/coverage-v8
npm install -D prisma && npm install @prisma/client
```

Editar `package.json` para añadir los scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 3: Escribir la prueba que falla**

Crear `src/calc/fechas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { diasEntre, sumarDias } from './fechas'

describe('diasEntre', () => {
  it('cuenta los días entre dos fechas', () => {
    expect(diasEntre('2026-09-01', '2026-10-01')).toBe(30)
  })

  it('devuelve cero para la misma fecha', () => {
    expect(diasEntre('2026-09-01', '2026-09-01')).toBe(0)
  })

  it('cuenta correctamente a través de un cambio de año', () => {
    expect(diasEntre('2026-12-15', '2027-02-15')).toBe(62)
  })

  it('devuelve negativo si la fecha final es anterior', () => {
    expect(diasEntre('2026-10-01', '2026-09-01')).toBe(-30)
  })

  it('no se desfasa por horario de verano ni por zona horaria', () => {
    expect(diasEntre('2026-03-01', '2026-04-01')).toBe(31)
  })
})

describe('sumarDias', () => {
  it('suma días cruzando el fin de mes', () => {
    expect(sumarDias('2026-09-25', 10)).toBe('2026-10-05')
  })

  it('acepta cero', () => {
    expect(sumarDias('2026-09-25', 0)).toBe('2026-09-25')
  })
})
```

- [ ] **Step 4: Ejecutar y verificar que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./fechas"`

- [ ] **Step 5: Escribir la implementación mínima**

Crear `src/calc/tipos.ts`:

```ts
/** Fecha sin hora, siempre en formato 'YYYY-MM-DD'. */
export type FechaISO = string
```

Crear `src/calc/fechas.ts`:

```ts
import type { FechaISO } from './tipos'

const MS_POR_DIA = 86_400_000

function aUtc(fecha: FechaISO): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

/** Días calendario entre dos fechas. Negativo si `hasta` es anterior a `desde`. */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_POR_DIA)
}

/** Devuelve la fecha resultante de sumar `dias` a `fecha`. */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const resultado = new Date(aUtc(fecha) + dias * MS_POR_DIA)
  return resultado.toISOString().slice(0, 10)
}

/** La fecha de hoy en la zona horaria de la finca. */
export function hoyBogota(): FechaISO {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date())
}
```

Nota para quien implemente: el formato `sv-SE` produce `YYYY-MM-DD` de forma nativa. No reemplazar por `toISOString()`, que devolvería la fecha en UTC y adelantaría un día a partir de las 7 de la noche hora de Colombia.

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npm test`
Expected: PASS — 7 pruebas

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: andamio del proyecto y aritmética de fechas sin zona horaria"
```

---

## Task 2: Ganancia diaria de peso

**Files:**
- Create: `src/calc/gdp.ts`
- Test: `src/calc/gdp.test.ts`

**Interfaces:**
- Consumes: `diasEntre` de `src/calc/fechas.ts`, `FechaISO` de `src/calc/tipos.ts`
- Produces: `type Medicion = { fecha: FechaISO; pesoKg: number }`; `gdpEntre(anterior: Medicion, actual: Medicion): number | null` en gramos por día; `gdpAcumulada(entrada: Medicion, actual: Medicion): number | null`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/gdp.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { gdpAcumulada, gdpEntre } from './gdp'

describe('gdpEntre', () => {
  it('calcula gramos por día entre dos pesajes', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2026-10-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBe(800)
  })

  it('devuelve negativo cuando el animal perdió peso', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 180 }
    const actual = { fecha: '2026-10-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBe(-200)
  })

  it('devuelve null si no pasó ningún día', () => {
    const misma = { fecha: '2026-09-01', pesoKg: 150 }
    expect(gdpEntre(misma, { fecha: '2026-09-01', pesoKg: 152 })).toBeNull()
  })

  it('devuelve null si el pesaje actual es anterior al previo', () => {
    const anterior = { fecha: '2026-10-01', pesoKg: 150 }
    const actual = { fecha: '2026-09-01', pesoKg: 174 }
    expect(gdpEntre(anterior, actual)).toBeNull()
  })

  it('redondea a gramos enteros', () => {
    const anterior = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2026-09-08', pesoKg: 155.3 }
    expect(gdpEntre(anterior, actual)).toBe(757)
  })
})

describe('gdpAcumulada', () => {
  it('mide contra el peso de entrada del animal', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    const actual = { fecha: '2027-02-01', pesoKg: 276 }
    expect(gdpAcumulada(entrada, actual)).toBe(824)
  })

  it('devuelve null el día de la entrada', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    expect(gdpAcumulada(entrada, { fecha: '2026-09-01', pesoKg: 150 })).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/gdp.test.ts`
Expected: FAIL — `Failed to resolve import "./gdp"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/gdp.ts`:

```ts
import { diasEntre } from './fechas'
import type { FechaISO } from './tipos'

export type Medicion = { fecha: FechaISO; pesoKg: number }

/**
 * Ganancia diaria de peso en gramos por día entre dos mediciones del mismo animal.
 * Devuelve null cuando no hay un intervalo de días válido: sin días transcurridos
 * no hay ganancia diaria, y devolver cero sería afirmar algo que no se midió.
 */
export function gdpEntre(anterior: Medicion, actual: Medicion): number | null {
  const dias = diasEntre(anterior.fecha, actual.fecha)
  if (dias <= 0) return null
  return Math.round(((actual.pesoKg - anterior.pesoKg) * 1000) / dias)
}

/** Ganancia diaria acumulada desde el ingreso del animal a la finca. */
export function gdpAcumulada(entrada: Medicion, actual: Medicion): number | null {
  return gdpEntre(entrada, actual)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/gdp.test.ts`
Expected: PASS — 7 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cálculo de ganancia diaria de peso individual y acumulada"
```

---

## Task 3: Clasificación por semáforo

**Files:**
- Create: `src/calc/clasificacion.ts`
- Test: `src/calc/clasificacion.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `type Clasificacion = 'excelente' | 'bueno' | 'normal' | 'bajo' | 'critico' | 'sin_dato'`; `type Umbrales = { excelente: number; bueno: number; normal: number; bajo: number }`; `clasificar(gdp: number | null, umbrales: Umbrales): Clasificacion`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/clasificacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clasificar, type Umbrales } from './clasificacion'

const umbrales: Umbrales = { excelente: 900, bueno: 750, normal: 600, bajo: 400 }

describe('clasificar', () => {
  it('clasifica como excelente en el umbral exacto', () => {
    expect(clasificar(900, umbrales)).toBe('excelente')
  })

  it('clasifica como bueno justo debajo de excelente', () => {
    expect(clasificar(899, umbrales)).toBe('bueno')
  })

  it('clasifica como normal', () => {
    expect(clasificar(640, umbrales)).toBe('normal')
  })

  it('clasifica como bajo rendimiento', () => {
    expect(clasificar(450, umbrales)).toBe('bajo')
  })

  it('clasifica como crítico por debajo del umbral bajo', () => {
    expect(clasificar(399, umbrales)).toBe('critico')
  })

  it('clasifica como crítico cuando el animal pierde peso', () => {
    expect(clasificar(-200, umbrales)).toBe('critico')
  })

  it('devuelve sin_dato cuando no hay ganancia calculable', () => {
    expect(clasificar(null, umbrales)).toBe('sin_dato')
  })

  it('respeta umbrales distintos a los de arranque', () => {
    const propios: Umbrales = { excelente: 1000, bueno: 850, normal: 700, bajo: 500 }
    expect(clasificar(900, propios)).toBe('bueno')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/clasificacion.test.ts`
Expected: FAIL — `Failed to resolve import "./clasificacion"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/clasificacion.ts`:

```ts
export type Clasificacion = 'excelente' | 'bueno' | 'normal' | 'bajo' | 'critico' | 'sin_dato'

/** Cortes en gramos por día. Se leen de la base de datos, nunca se fijan en el código. */
export type Umbrales = {
  excelente: number
  bueno: number
  normal: number
  bajo: number
}

export function clasificar(gdp: number | null, umbrales: Umbrales): Clasificacion {
  if (gdp === null) return 'sin_dato'
  if (gdp >= umbrales.excelente) return 'excelente'
  if (gdp >= umbrales.bueno) return 'bueno'
  if (gdp >= umbrales.normal) return 'normal'
  if (gdp >= umbrales.bajo) return 'bajo'
  return 'critico'
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/clasificacion.test.ts`
Expected: PASS — 8 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: clasificación de desempeño por umbrales configurables"
```

---

## Task 4: Promedio de lote con n visible

**Files:**
- Create: `src/calc/lote.ts`
- Test: `src/calc/lote.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `type ResumenPromedio = { promedio: number | null; n: number; total: number; cobertura: number }`; `promediarGdp(valores: (number | null)[], totalAnimales: number): ResumenPromedio`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/lote.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { promediarGdp } from './lote'

describe('promediarGdp', () => {
  it('promedia solo los animales con dato y reporta el n', () => {
    const resultado = promediarGdp([800, 700, null, 900], 56)
    expect(resultado.promedio).toBe(800)
    expect(resultado.n).toBe(3)
    expect(resultado.total).toBe(56)
  })

  it('reporta la cobertura como fracción de animales medidos', () => {
    const resultado = promediarGdp([800, 700], 4)
    expect(resultado.cobertura).toBe(0.5)
  })

  it('devuelve promedio null cuando ningún animal tiene dato', () => {
    const resultado = promediarGdp([null, null], 10)
    expect(resultado.promedio).toBeNull()
    expect(resultado.n).toBe(0)
    expect(resultado.cobertura).toBe(0)
  })

  it('devuelve promedio null con la lista vacía', () => {
    const resultado = promediarGdp([], 0)
    expect(resultado.promedio).toBeNull()
    expect(resultado.cobertura).toBe(0)
  })

  it('incluye las pérdidas de peso en el promedio', () => {
    const resultado = promediarGdp([800, -200], 2)
    expect(resultado.promedio).toBe(300)
  })

  it('redondea el promedio a gramos enteros', () => {
    const resultado = promediarGdp([800, 801], 2)
    expect(resultado.promedio).toBe(801)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/lote.test.ts`
Expected: FAIL — `Failed to resolve import "./lote"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/lote.ts`:

```ts
export type ResumenPromedio = {
  /** Promedio en gramos por día, o null si ningún animal tiene dato. */
  promedio: number | null
  /** Cuántos animales aportaron dato. */
  n: number
  /** Cuántos animales hay en el grupo. */
  total: number
  /** Fracción entre 0 y 1 del grupo que se alcanzó a medir. */
  cobertura: number
}

/**
 * Promedia ganancias diarias ignorando los animales sin dato, pero conservando
 * el n y la cobertura. Un promedio sin su n es una afirmación sin evidencia.
 */
export function promediarGdp(valores: (number | null)[], totalAnimales: number): ResumenPromedio {
  const conDato = valores.filter((v): v is number => v !== null)
  const cobertura = totalAnimales > 0 ? conDato.length / totalAnimales : 0
  if (conDato.length === 0) {
    return { promedio: null, n: 0, total: totalAnimales, cobertura: 0 }
  }
  const suma = conDato.reduce((acumulado, valor) => acumulado + valor, 0)
  return {
    promedio: Math.round(suma / conDato.length),
    n: conDato.length,
    total: totalAnimales,
    cobertura,
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/lote.test.ts`
Expected: PASS — 6 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: promedio de ganancia diaria por lote conservando el n"
```

---

## Task 5: Kilos producidos

**Files:**
- Create: `src/calc/produccion.ts`
- Test: `src/calc/produccion.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `type EstadoAnimal = 'activo' | 'vendido' | 'muerto' | 'robado'`; `type AnimalProduccion = { estado: EstadoAnimal; pesoEntradaKg: number; pesoUltimoKg: number | null }`; `kgProducidos(animales: AnimalProduccion[]): number`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/produccion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { kgProducidos, type AnimalProduccion } from './produccion'

describe('kgProducidos', () => {
  it('suma la ganancia de los animales activos', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 190 },
    ]
    expect(kgProducidos(animales)).toBe(90)
  })

  it('cuenta los kilos que ganó un animal vendido antes de salir', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'vendido', pesoEntradaKg: 150, pesoUltimoKg: 280 },
    ]
    expect(kgProducidos(animales)).toBe(130)
  })

  it('no cuenta nada de un animal muerto', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'muerto', pesoEntradaKg: 150, pesoUltimoKg: 190 },
    ]
    expect(kgProducidos(animales)).toBe(50)
  })

  it('no cuenta nada de un animal robado', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'robado', pesoEntradaKg: 150, pesoUltimoKg: 210 },
    ]
    expect(kgProducidos(animales)).toBe(0)
  })

  it('ignora al animal que todavía no tiene ningún pesaje', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: null },
    ]
    expect(kgProducidos(animales)).toBe(0)
  })

  it('resta cuando un animal perdió peso', () => {
    const animales: AnimalProduccion[] = [
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 200 },
      { estado: 'activo', pesoEntradaKg: 150, pesoUltimoKg: 140 },
    ]
    expect(kgProducidos(animales)).toBe(40)
  })

  it('devuelve cero sin animales', () => {
    expect(kgProducidos([])).toBe(0)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/produccion.test.ts`
Expected: FAIL — `Failed to resolve import "./produccion"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/produccion.ts`:

```ts
export type EstadoAnimal = 'activo' | 'vendido' | 'muerto' | 'robado'

export type AnimalProduccion = {
  estado: EstadoAnimal
  pesoEntradaKg: number
  /** Último peso medido, o null si nunca se ha pesado. */
  pesoUltimoKg: number | null
}

/**
 * Kilos adicionales producidos por el grupo.
 *
 * Los animales muertos y robados aportan cero: sus kilos no llegaron a venderse,
 * aunque su costo permanezca en el ciclo. Contarlos inflaría la producción y
 * abarataría artificialmente el costo por kilogramo.
 */
export function kgProducidos(animales: AnimalProduccion[]): number {
  return animales.reduce((total, animal) => {
    if (animal.estado === 'muerto' || animal.estado === 'robado') return total
    if (animal.pesoUltimoKg === null) return total
    return total + (animal.pesoUltimoKg - animal.pesoEntradaKg)
  }, 0)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/produccion.test.ts`
Expected: PASS — 7 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: kilos producidos descontando mortalidad y robo"
```

---

## Task 6: Carga animal, ocupación y descanso

**Files:**
- Create: `src/calc/potrero.ts`
- Test: `src/calc/potrero.test.ts`

**Interfaces:**
- Consumes: `diasEntre` de `src/calc/fechas.ts`, `FechaISO` de `src/calc/tipos.ts`
- Produces: `type Carga = { kgPorHa: number; cabezasPorHa: number }`; `calcularCarga(pesoVivoTotalKg: number, cabezas: number, hectareas: number): Carga | null`; `diasOcupacion(entrada: FechaISO, hoy: FechaISO): number`; `diasDescanso(salida: FechaISO | null, hoy: FechaISO): number | null`; `type EstadoCapacidad = 'holgado' | 'ajustado' | 'sobrecargado'`; `evaluarCapacidad(pesoVivoTotalKg: number, capacidadKg: number): EstadoCapacidad`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/potrero.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calcularCarga, diasDescanso, diasOcupacion, evaluarCapacidad } from './potrero'

describe('calcularCarga', () => {
  it('calcula kilos vivos y cabezas por hectárea', () => {
    const carga = calcularCarga(11200, 56, 35)
    expect(carga).not.toBeNull()
    expect(carga!.kgPorHa).toBe(320)
    expect(carga!.cabezasPorHa).toBeCloseTo(1.6, 2)
  })

  it('devuelve null si el potrero no tiene hectáreas registradas', () => {
    expect(calcularCarga(11200, 56, 0)).toBeNull()
  })

  it('devuelve cero cuando el potrero está vacío', () => {
    const carga = calcularCarga(0, 0, 35)
    expect(carga!.kgPorHa).toBe(0)
    expect(carga!.cabezasPorHa).toBe(0)
  })
})

describe('diasOcupacion', () => {
  it('cuenta los días desde que entró el lote', () => {
    expect(diasOcupacion('2026-09-01', '2026-09-21')).toBe(20)
  })

  it('devuelve cero el mismo día de la entrada', () => {
    expect(diasOcupacion('2026-09-01', '2026-09-01')).toBe(0)
  })
})

describe('diasDescanso', () => {
  it('cuenta los días desde que salió el último lote', () => {
    expect(diasDescanso('2026-08-01', '2026-09-21')).toBe(51)
  })

  it('devuelve null si el potrero nunca ha sido ocupado', () => {
    expect(diasDescanso(null, '2026-09-21')).toBeNull()
  })
})

describe('evaluarCapacidad', () => {
  it('marca holgado por debajo del noventa por ciento', () => {
    expect(evaluarCapacidad(8000, 10000)).toBe('holgado')
  })

  it('marca ajustado entre el noventa y el cien por ciento', () => {
    expect(evaluarCapacidad(9500, 10000)).toBe('ajustado')
  })

  it('marca sobrecargado al pasar la capacidad', () => {
    expect(evaluarCapacidad(10080, 10000)).toBe('sobrecargado')
  })

  it('marca holgado si no hay capacidad registrada', () => {
    expect(evaluarCapacidad(10080, 0)).toBe('holgado')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/potrero.test.ts`
Expected: FAIL — `Failed to resolve import "./potrero"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/potrero.ts`:

```ts
import { diasEntre } from './fechas'
import type { FechaISO } from './tipos'

export type Carga = { kgPorHa: number; cabezasPorHa: number }

export function calcularCarga(
  pesoVivoTotalKg: number,
  cabezas: number,
  hectareas: number,
): Carga | null {
  if (hectareas <= 0) return null
  return {
    kgPorHa: Math.round(pesoVivoTotalKg / hectareas),
    cabezasPorHa: cabezas / hectareas,
  }
}

export function diasOcupacion(entrada: FechaISO, hoy: FechaISO): number {
  return Math.max(0, diasEntre(entrada, hoy))
}

export function diasDescanso(salida: FechaISO | null, hoy: FechaISO): number | null {
  if (salida === null) return null
  return Math.max(0, diasEntre(salida, hoy))
}

export type EstadoCapacidad = 'holgado' | 'ajustado' | 'sobrecargado'

/**
 * Compara el peso vivo encima del potrero contra su capacidad configurada.
 * Sin capacidad registrada no se puede afirmar sobrecarga, así que devuelve holgado.
 */
export function evaluarCapacidad(pesoVivoTotalKg: number, capacidadKg: number): EstadoCapacidad {
  if (capacidadKg <= 0) return 'holgado'
  const uso = pesoVivoTotalKg / capacidadKg
  if (uso > 1) return 'sobrecargado'
  if (uso >= 0.9) return 'ajustado'
  return 'holgado'
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/potrero.test.ts`
Expected: PASS — 11 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: carga animal, días de ocupación y descanso, y estado de capacidad"
```

---

## Task 7: Proyección de peso

**Files:**
- Create: `src/calc/proyeccion.ts`
- Test: `src/calc/proyeccion.test.ts`

**Interfaces:**
- Consumes: `sumarDias` de `src/calc/fechas.ts`, `FechaISO` de `src/calc/tipos.ts`
- Produces: `proyectarPeso(pesoActualKg: number, gdp: number | null, dias: number): number | null`; `type LlegadaAObjetivo = { dias: number; fecha: FechaISO }`; `proyectarLlegada(pesoActualKg: number, objetivoKg: number, gdp: number | null, desde: FechaISO): LlegadaAObjetivo | null`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/proyeccion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { proyectarLlegada, proyectarPeso } from './proyeccion'

describe('proyectarPeso', () => {
  it('proyecta el peso a partir de la ganancia observada', () => {
    expect(proyectarPeso(200, 800, 90)).toBe(272)
  })

  it('devuelve null sin ganancia observada', () => {
    expect(proyectarPeso(200, null, 90)).toBeNull()
  })

  it('proyecta a la baja si el animal viene perdiendo peso', () => {
    expect(proyectarPeso(200, -100, 30)).toBe(197)
  })

  it('redondea a un decimal', () => {
    expect(proyectarPeso(200, 833, 30)).toBe(225)
  })
})

describe('proyectarLlegada', () => {
  it('calcula días y fecha estimada para alcanzar el peso objetivo', () => {
    const llegada = proyectarLlegada(200, 320, 800, '2026-10-01')
    expect(llegada).not.toBeNull()
    expect(llegada!.dias).toBe(150)
    expect(llegada!.fecha).toBe('2027-02-28')
  })

  it('devuelve cero días si el animal ya alcanzó el objetivo', () => {
    const llegada = proyectarLlegada(330, 320, 800, '2026-10-01')
    expect(llegada!.dias).toBe(0)
    expect(llegada!.fecha).toBe('2026-10-01')
  })

  it('devuelve null si el animal no está ganando peso', () => {
    expect(proyectarLlegada(200, 320, 0, '2026-10-01')).toBeNull()
    expect(proyectarLlegada(200, 320, -100, '2026-10-01')).toBeNull()
  })

  it('devuelve null sin ganancia observada', () => {
    expect(proyectarLlegada(200, 320, null, '2026-10-01')).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/proyeccion.test.ts`
Expected: FAIL — `Failed to resolve import "./proyeccion"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/proyeccion.ts`:

```ts
import { sumarDias } from './fechas'
import type { FechaISO } from './tipos'

/**
 * Proyecta el peso futuro con la ganancia OBSERVADA del animal, no con la objetivo.
 * Proyectar con la meta produciría una finca que siempre cumple en el papel.
 */
export function proyectarPeso(pesoActualKg: number, gdp: number | null, dias: number): number | null {
  if (gdp === null) return null
  return Math.round((pesoActualKg + (gdp * dias) / 1000) * 10) / 10
}

export type LlegadaAObjetivo = { dias: number; fecha: FechaISO }

export function proyectarLlegada(
  pesoActualKg: number,
  objetivoKg: number,
  gdp: number | null,
  desde: FechaISO,
): LlegadaAObjetivo | null {
  if (pesoActualKg >= objetivoKg) return { dias: 0, fecha: desde }
  if (gdp === null || gdp <= 0) return null
  const dias = Math.ceil(((objetivoKg - pesoActualKg) * 1000) / gdp)
  return { dias, fecha: sumarDias(desde, dias) }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/proyeccion.test.ts`
Expected: PASS — 8 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: proyección de peso y de fecha de llegada al peso objetivo"
```

---

## Task 8: Reglas de validación de pesajes

**Files:**
- Create: `src/calc/validacion.ts`
- Test: `src/calc/validacion.test.ts`

**Interfaces:**
- Consumes: `gdpEntre` y `Medicion` de `src/calc/gdp.ts`, `diasEntre` de `src/calc/fechas.ts`, `FechaISO` de `src/calc/tipos.ts`
- Produces: `type Nivel = 'ok' | 'advertencia' | 'rechazo'`; `type Veredicto = { nivel: Nivel; mensaje: string; gdp: number | null }`; `validarMedicion(entrada: { fecha: FechaISO; pesoKg: number }, anterior: Medicion | null, nueva: Medicion): Veredicto`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/calc/validacion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validarMedicion } from './validacion'

const entrada = { fecha: '2026-09-01', pesoKg: 150 }

describe('validarMedicion', () => {
  it('acepta un pesaje normal', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-11-01', pesoKg: 199 },
    )
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(806)
  })

  it('acepta el primer pesaje midiendo contra la entrada', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 174 })
    expect(veredicto.nivel).toBe('ok')
    expect(veredicto.gdp).toBe(800)
  })

  it('rechaza un pesaje anterior al ingreso del animal', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-08-15', pesoKg: 150 })
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('anterior al ingreso')
  })

  it('rechaza un peso que no es positivo', () => {
    const veredicto = validarMedicion(entrada, null, { fecha: '2026-10-01', pesoKg: 0 })
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mayor que cero')
  })

  it('rechaza un segundo pesaje el mismo día', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-01', pesoKg: 176 },
    )
    expect(veredicto.nivel).toBe('rechazo')
    expect(veredicto.mensaje).toContain('mismo día')
  })

  it('advierte cuando la ganancia diaria supera los dos mil gramos', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 174 },
      { fecha: '2026-10-11', pesoKg: 200 },
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('2.600 g/día')
  })

  it('advierte cuando el animal pierde más del diez por ciento', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 170 },
    )
    expect(veredicto.nivel).toBe('advertencia')
    expect(veredicto.mensaje).toContain('perdió')
  })

  it('no advierte por una pérdida pequeña, que es normal en verano', () => {
    const veredicto = validarMedicion(
      entrada,
      { fecha: '2026-10-01', pesoKg: 200 },
      { fecha: '2026-11-01', pesoKg: 195 },
    )
    expect(veredicto.nivel).toBe('ok')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/calc/validacion.test.ts`
Expected: FAIL — `Failed to resolve import "./validacion"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/calc/validacion.ts`:

```ts
import { diasEntre } from './fechas'
import { gdpEntre, type Medicion } from './gdp'
import type { FechaISO } from './tipos'

export type Nivel = 'ok' | 'advertencia' | 'rechazo'
export type Veredicto = { nivel: Nivel; mensaje: string; gdp: number | null }

const GDP_MAXIMA_CREIBLE = 2000
const PERDIDA_MAXIMA_TOLERADA = 0.1

const formato = new Intl.NumberFormat('es-CO')

/**
 * Evalúa un peso recién digitado contra el historial del animal.
 *
 * Rechaza lo imposible y advierte lo improbable, pero nunca bloquea lo improbable:
 * un novillo puede de verdad perder peso en el verano, y un sistema que lo impide
 * obliga a mentirle. Lo que no se puede permitir es que un dedazo entre sin que
 * nadie lo vea.
 */
export function validarMedicion(
  entrada: { fecha: FechaISO; pesoKg: number },
  anterior: Medicion | null,
  nueva: Medicion,
): Veredicto {
  if (nueva.pesoKg <= 0) {
    return { nivel: 'rechazo', mensaje: 'El peso debe ser mayor que cero.', gdp: null }
  }

  if (diasEntre(entrada.fecha, nueva.fecha) < 0) {
    return {
      nivel: 'rechazo',
      mensaje: `La fecha del pesaje es anterior al ingreso del animal (${entrada.fecha}).`,
      gdp: null,
    }
  }

  const referencia = anterior ?? entrada

  if (anterior && diasEntre(anterior.fecha, nueva.fecha) === 0) {
    return {
      nivel: 'rechazo',
      mensaje: 'Ya hay un pesaje de este animal el mismo día.',
      gdp: null,
    }
  }

  const gdp = gdpEntre(referencia, nueva)

  if (gdp !== null && gdp > GDP_MAXIMA_CREIBLE) {
    return {
      nivel: 'advertencia',
      mensaje: `Ganancia de ${formato.format(gdp)} g/día. Revisa que el peso esté bien digitado.`,
      gdp,
    }
  }

  const perdida = (referencia.pesoKg - nueva.pesoKg) / referencia.pesoKg
  if (perdida > PERDIDA_MAXIMA_TOLERADA) {
    const kilos = Math.round((referencia.pesoKg - nueva.pesoKg) * 10) / 10
    return {
      nivel: 'advertencia',
      mensaje: `El animal perdió ${kilos} kg desde el pesaje anterior.`,
      gdp,
    }
  }

  return { nivel: 'ok', mensaje: '', gdp }
}
```

Nota para quien implemente: `GDP_MAXIMA_CREIBLE` y `PERDIDA_MAXIMA_TOLERADA` son constantes de la fórmula de detección de errores de digitación, no parámetros de manejo de la finca. Por eso viven en el código y no en la base de datos. Los umbrales de la tarea 3, que sí son criterio ganadero, van en la base de datos.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/calc/validacion.test.ts`
Expected: PASS — 8 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: validación de pesajes que rechaza lo imposible y advierte lo improbable"
```

---

## Task 9: Prueba de referencia contra los números conocidos de la finca

**Files:**
- Test: `src/calc/finca.referencia.test.ts`

**Interfaces:**
- Consumes: todos los módulos de `src/calc/`
- Produces: nada — es una prueba de aceptación de los cálculos

Esta tarea no agrega código de producción. Verifica que los módulos puros reproducen los números que ya se calcularon a mano para Santa Verónica. Si el sistema no reproduce números verificados, no sirve.

- [ ] **Step 1: Escribir la prueba de referencia**

Crear `src/calc/finca.referencia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clasificar, type Umbrales } from './clasificacion'
import { gdpAcumulada } from './gdp'
import { promediarGdp } from './lote'
import { calcularCarga } from './potrero'
import { kgProducidos, type AnimalProduccion } from './produccion'
import { proyectarLlegada } from './proyeccion'

const UMBRALES: Umbrales = { excelente: 900, bueno: 750, normal: 600, bajo: 400 }

describe('Santa Verónica — números conocidos', () => {
  it('reproduce el 50,6 % de ganancia proyectado de septiembre a febrero', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    const salida = { fecha: '2027-02-01', pesoKg: 226 }
    const ganancia = (salida.pesoKg - entrada.pesoKg) / entrada.pesoKg
    expect(ganancia).toBeCloseTo(0.506, 2)
    expect(gdpAcumulada(entrada, salida)).toBe(497)
  })

  it('clasifica como bajo rendimiento el desempeño real del lote 2025', () => {
    const entrada = { fecha: '2025-01-01', pesoKg: 142 }
    const salida = { fecha: '2026-01-01', pesoKg: 254 }
    const gdp = gdpAcumulada(entrada, salida)
    expect(gdp).toBe(307)
    expect(clasificar(gdp, UMBRALES)).toBe('critico')
  })

  it('calcula la carga del lote de 56 novillos sobre las 35 hectáreas útiles', () => {
    const carga = calcularCarga(56 * 200, 56, 35)
    expect(carga!.kgPorHa).toBe(320)
    expect(carga!.cabezasPorHa).toBeCloseTo(1.6, 1)
  })

  it('cuenta la producción de un ciclo con una muerte', () => {
    const animales: AnimalProduccion[] = Array.from({ length: 56 }, (_, i) => ({
      estado: i === 0 ? ('muerto' as const) : ('activo' as const),
      pesoEntradaKg: 150,
      pesoUltimoKg: 226,
    }))
    expect(kgProducidos(animales)).toBe(55 * 76)
  })

  it('estima la fecha de venta con la ganancia objetivo de 750 g por día', () => {
    const llegada = proyectarLlegada(150, 320, 750, '2026-09-01')
    expect(llegada!.dias).toBe(227)
    expect(llegada!.fecha).toBe('2027-04-16')
  })

  it('reporta la cobertura cuando solo se pesan los animales testigo', () => {
    const valores = Array.from({ length: 56 }, (_, i) => (i < 14 ? 800 : null))
    const resumen = promediarGdp(valores, 56)
    expect(resumen.promedio).toBe(800)
    expect(resumen.n).toBe(14)
    expect(resumen.cobertura).toBeCloseTo(0.25, 2)
  })
})
```

- [ ] **Step 2: Ejecutar la suite completa**

Run: `npm test`
Expected: PASS — todas las pruebas de `src/calc/`

Si alguna cifra de esta prueba no coincide, **el error está en el cálculo, no en la prueba**. Estos números salieron del análisis financiero de la finca y están verificados a mano.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: prueba de referencia contra los números verificados de Santa Verónica"
```

---

## Task 10: Esquema de datos y base de pruebas

**Files:**
- Create: `.env`, `.env.test`, `.env.example`
- Modify: `vitest.config.ts`
- Create: `prisma/schema.prisma`
- Create: `src/datos/cliente.ts`
- Create: `src/datos/conversion.ts`
- Test: `src/datos/conversion.test.ts`

**Interfaces:**
- Consumes: `FechaISO` de `src/calc/tipos.ts`, `EstadoAnimal` de `src/calc/produccion.ts`
- Produces: `prisma` (cliente compartido); `aFechaISO(fecha: Date): FechaISO`; `aFechaDb(fecha: FechaISO): Date`; `aKg(valor: Prisma.Decimal): number`

- [ ] **Step 1: Apuntar a las dos bases de Postgres**

PostgreSQL 16 ya corre en esta máquina como servicio de Homebrew, y las dos bases
ya están creadas (`sofia` y `sofia_test`). No hay contenedores de por medio.

Verificar antes de seguir:

```bash
psql -lqt | grep -E '^ sofia'
```

Expected: dos líneas, `sofia` y `sofia_test`.

Crear `.env.example`:

```
DATABASE_URL="postgresql://jdh@localhost:5432/sofia"
AUTH_SECRET="cambiar-por-una-cadena-larga-y-aleatoria"
```

Crear `.env`:

```
DATABASE_URL="postgresql://jdh@localhost:5432/sofia"
AUTH_SECRET="desarrollo-local-cambiar-en-produccion"
```

Crear `.env.test`:

```
DATABASE_URL="postgresql://jdh@localhost:5432/sofia_test"
AUTH_SECRET="pruebas"
```

**Las pruebas van contra `sofia_test`, nunca contra `sofia`.** Cada prueba de
`src/datos/` empieza con `deleteMany()`; apuntadas a la base de desarrollo
borrarían los datos reales de la finca en cada corrida.

Conectar la variable de entorno a Vitest en `vitest.config.ts`:

```ts
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
```

```bash
npm install -D dotenv
```

Aplicar el esquema también a la base de pruebas, cada vez que cambie:

```bash
DATABASE_URL="postgresql://jdh@localhost:5432/sofia_test" npx prisma migrate deploy
```

- [ ] **Step 2: Escribir el esquema**

Crear `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EstadoAnimal {
  activo
  vendido
  muerto
  robado
}

enum TipoLote {
  ceba
  leche
  otros
}

enum MetodoPesaje {
  cinta
  bascula
  estimacion
}

enum TipoEventoSanitario {
  vacuna
  desparasitacion
  vitamina
  tratamiento
}

model Usuario {
  id       String @id @default(cuid())
  nombre   String
  correo   String @unique
  claveHash String
  creadoEn DateTime @default(now())
}

/// Supuestos editables con fecha de vigencia. Cambiar uno hoy nunca reescribe la historia.
model Parametro {
  id        String   @id @default(cuid())
  clave     String
  valor     String
  vigenteDesde DateTime @db.Date
  creadoPorId String?
  creadoEn  DateTime @default(now())

  @@index([clave, vigenteDesde])
}

model Finca {
  id             String @id @default(cuid())
  nombre         String
  hectareasUtiles Decimal @db.Decimal(6, 2)
}

model Potrero {
  id            String  @id @default(cuid())
  nombre        String  @unique
  hectareas     Decimal @db.Decimal(6, 2)
  tipoPasto     String?
  capacidadKg   Int     @default(0)
  tieneAgua     Boolean @default(true)
  notas         String?
  anuladoEn     DateTime?
  motivoAnulacion String?

  lotes       Lote[]
  movimientosDesde Movimiento[] @relation("origen")
  movimientosHasta Movimiento[] @relation("destino")
}

model Lote {
  id              String   @id @default(cuid())
  nombre          String   @unique
  tipo            TipoLote
  fechaApertura   DateTime @db.Date
  fechaCierre     DateTime? @db.Date
  potreroActualId String?
  potreroActual   Potrero? @relation(fields: [potreroActualId], references: [id])
  fechaEntradaPotrero DateTime? @db.Date

  animales    Animal[]
  movimientos Movimiento[]
  eventos     EventoSanitario[]
}

model Animal {
  id                String       @id @default(cuid())
  chapeta           String       @unique
  loteId            String
  lote              Lote         @relation(fields: [loteId], references: [id])
  sexo              String
  raza              String?
  cruce             String?
  proveedor         String?
  fechaEntrada      DateTime     @db.Date
  edadEntradaMeses  Int?
  condicionCorporal Int?
  pesoEntradaKg     Decimal      @db.Decimal(5, 1)
  /// Costo real de entrada en pesos colombianos, entero. Lo llena el plan 2.
  costoEntradaCop   Int          @default(0)
  estado            EstadoAnimal @default(activo)
  fechaSalida       DateTime?    @db.Date
  motivoSalida      String?

  mediciones Medicion[]
  eventos    EventoSanitario[]

  @@index([loteId, estado])
}

model Pesaje {
  id           String       @id @default(cuid())
  fecha        DateTime     @db.Date
  metodo       MetodoPesaje
  responsable  String
  notas        String?
  registradoPorId String
  creadoEn     DateTime     @default(now())
  anuladoEn    DateTime?
  motivoAnulacion String?

  mediciones Medicion[]

  @@index([fecha])
}

model Medicion {
  id       String  @id @default(cuid())
  pesajeId String
  pesaje   Pesaje  @relation(fields: [pesajeId], references: [id], onDelete: Cascade)
  animalId String
  animal   Animal  @relation(fields: [animalId], references: [id])
  pesoKg   Decimal @db.Decimal(5, 1)

  @@unique([pesajeId, animalId])
  @@index([animalId])
}

model Movimiento {
  id              String   @id @default(cuid())
  loteId          String
  lote            Lote     @relation(fields: [loteId], references: [id])
  potreroOrigenId String?
  potreroOrigen   Potrero? @relation("origen", fields: [potreroOrigenId], references: [id])
  potreroDestinoId String
  potreroDestino  Potrero  @relation("destino", fields: [potreroDestinoId], references: [id])
  fecha           DateTime @db.Date
  registradoPorId String
  creadoEn        DateTime @default(now())

  @@index([loteId, fecha])
  @@index([potreroDestinoId, fecha])
}

model EventoSanitario {
  id            String   @id @default(cuid())
  tipo          TipoEventoSanitario
  fecha         DateTime @db.Date
  producto      String
  dosis         String?
  responsable   String
  proximaFecha  DateTime? @db.Date
  notas         String?
  animalId      String?
  animal        Animal?  @relation(fields: [animalId], references: [id])
  loteId        String?
  lote          Lote?    @relation(fields: [loteId], references: [id])
  registradoPorId String
  creadoEn      DateTime @default(now())

  @@index([proximaFecha])
}
```

- [ ] **Step 3: Aplicar la migración**

```bash
npx prisma migrate dev --name inicial
```

Expected: la migración se aplica y se genera el cliente.

- [ ] **Step 4: Escribir la prueba de conversión que falla**

Crear `src/datos/conversion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aFechaDb, aFechaISO } from './conversion'

describe('aFechaISO', () => {
  it('convierte una fecha de la base a cadena YYYY-MM-DD', () => {
    expect(aFechaISO(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026-09-01')
  })

  it('no adelanta un día por la zona horaria de Colombia', () => {
    expect(aFechaISO(new Date('2026-12-31T00:00:00.000Z'))).toBe('2026-12-31')
  })
})

describe('aFechaDb', () => {
  it('convierte una cadena a medianoche UTC', () => {
    expect(aFechaDb('2026-09-01').toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('es la inversa exacta de aFechaISO', () => {
    expect(aFechaISO(aFechaDb('2027-02-28'))).toBe('2027-02-28')
  })
})
```

- [ ] **Step 5: Ejecutar y verificar que falla**

Run: `npm test src/datos/conversion.test.ts`
Expected: FAIL — `Failed to resolve import "./conversion"`

- [ ] **Step 6: Escribir la implementación**

Crear `src/datos/conversion.ts`:

```ts
import type { Prisma } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'

/**
 * Las columnas `@db.Date` de Postgres vuelven como medianoche UTC.
 * Recortar la cadena ISO es exacto y no toca la zona horaria local.
 */
export function aFechaISO(fecha: Date): FechaISO {
  return fecha.toISOString().slice(0, 10)
}

export function aFechaDb(fecha: FechaISO): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}

/** Los Decimal de Prisma no son números de JavaScript. Se convierten en la frontera. */
export function aNumero(valor: Prisma.Decimal): number {
  return Number(valor)
}

/** Alias con nombre de dominio para las columnas de peso. */
export const aKg = aNumero
```

Crear `src/datos/cliente.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const global_ = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = global_.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') global_.prisma = prisma
```

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `npm test src/datos/conversion.test.ts`
Expected: PASS — 4 pruebas

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: esquema de datos y frontera de conversión entre la base y los cálculos"
```

---

## Task 11: Semilla de parámetros y lectura vigente

**Files:**
- Create: `prisma/seed.ts`
- Create: `src/datos/parametros.ts`
- Test: `src/datos/parametros.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `aFechaISO`, `FechaISO`, `Umbrales`
- Produces: `leerParametro(clave: string, en: FechaISO): Promise<string | null>`; `leerUmbrales(en: FechaISO): Promise<Umbrales>`; `guardarParametro(clave: string, valor: string, vigenteDesde: FechaISO, usuarioId: string): Promise<void>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/parametros.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { guardarParametro, leerParametro, leerUmbrales } from './parametros'

beforeEach(async () => {
  await prisma.parametro.deleteMany()
})

describe('leerParametro', () => {
  it('devuelve el valor vigente en la fecha consultada', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    await guardarParametro('gdp_objetivo', '800', '2027-01-01', 'u1')

    expect(await leerParametro('gdp_objetivo', '2026-12-31')).toBe('750')
    expect(await leerParametro('gdp_objetivo', '2027-01-01')).toBe('800')
  })

  it('devuelve null antes de la primera vigencia', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    expect(await leerParametro('gdp_objetivo', '2026-08-01')).toBeNull()
  })

  it('devuelve null para una clave que no existe', async () => {
    expect(await leerParametro('inexistente', '2026-09-01')).toBeNull()
  })
})

describe('leerUmbrales', () => {
  it('arma los umbrales desde los parámetros guardados', async () => {
    await guardarParametro('umbral_excelente', '900', '2026-09-01', 'u1')
    await guardarParametro('umbral_bueno', '750', '2026-09-01', 'u1')
    await guardarParametro('umbral_normal', '600', '2026-09-01', 'u1')
    await guardarParametro('umbral_bajo', '400', '2026-09-01', 'u1')

    expect(await leerUmbrales('2026-10-01')).toEqual({
      excelente: 900,
      bueno: 750,
      normal: 600,
      bajo: 400,
    })
  })

  it('lanza un error si faltan umbrales, en lugar de inventarlos', async () => {
    await expect(leerUmbrales('2026-10-01')).rejects.toThrow('umbral_excelente')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/parametros.test.ts`
Expected: FAIL — `Failed to resolve import "./parametros"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/parametros.ts`:

```ts
import type { Umbrales } from '@/calc/clasificacion'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb } from './conversion'

/** Devuelve el valor de la clave vigente en la fecha dada, o null si no había ninguno. */
export async function leerParametro(clave: string, en: FechaISO): Promise<string | null> {
  const fila = await prisma.parametro.findFirst({
    where: { clave, vigenteDesde: { lte: aFechaDb(en) } },
    orderBy: { vigenteDesde: 'desc' },
  })
  return fila?.valor ?? null
}

export async function guardarParametro(
  clave: string,
  valor: string,
  vigenteDesde: FechaISO,
  usuarioId: string,
): Promise<void> {
  await prisma.parametro.create({
    data: { clave, valor, vigenteDesde: aFechaDb(vigenteDesde), creadoPorId: usuarioId },
  })
}

async function exigir(clave: string, en: FechaISO): Promise<number> {
  const valor = await leerParametro(clave, en)
  if (valor === null) {
    throw new Error(`Falta el parámetro ${clave} vigente en ${en}. Configúralo antes de continuar.`)
  }
  return Number(valor)
}

/**
 * Arma los umbrales del semáforo desde la base.
 *
 * Si falta uno, lanza en lugar de usar un valor por omisión: un umbral inventado
 * clasificaría animales con un criterio que nadie decidió.
 */
export async function leerUmbrales(en: FechaISO): Promise<Umbrales> {
  return {
    excelente: await exigir('umbral_excelente', en),
    bueno: await exigir('umbral_bueno', en),
    normal: await exigir('umbral_normal', en),
    bajo: await exigir('umbral_bajo', en),
  }
}
```

- [ ] **Step 4: Escribir la semilla**

Crear `prisma/seed.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const VIGENTE_DESDE = new Date('2026-09-01T00:00:00.000Z')

/** Valores de arranque, todos editables desde Configuración. Ninguno es una constante del sistema. */
const PARAMETROS: Record<string, string> = {
  umbral_excelente: '900',
  umbral_bueno: '750',
  umbral_normal: '600',
  umbral_bajo: '400',
  gdp_objetivo: '750',
  peso_objetivo_venta_kg: '320',
}

async function main() {
  await prisma.finca.create({
    data: { nombre: 'Santa Verónica', hectareasUtiles: 35 },
  })

  for (const [clave, valor] of Object.entries(PARAMETROS)) {
    await prisma.parametro.create({ data: { clave, valor, vigenteDesde: VIGENTE_DESDE } })
  }
}

main().finally(() => prisma.$disconnect())
```

Añadir a `package.json`:

```json
{
  "prisma": { "seed": "npx tsx prisma/seed.ts" }
}
```

```bash
npm install -D tsx
npx prisma db seed
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test src/datos/parametros.test.ts`
Expected: PASS — 5 pruebas

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parámetros con fecha de vigencia y semilla de valores de arranque"
```

---

## Task 12: Autenticación de los dos usuarios

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/entrar/page.tsx`
- Create: `src/middleware.ts`
- Create: `scripts/crear-usuario.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: `auth()`, `signIn`, `signOut` de `src/auth.ts`; `usuarioActual(): Promise<{ id: string; nombre: string }>`

- [ ] **Step 1: Instalar y configurar Auth.js**

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

Crear `src/auth.ts`:

```ts
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/datos/cliente'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/entrar' },
  callbacks: {
    // Sin estos dos, session.user.id llega undefined y todo registro quedaría sin autor.
    jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
  providers: [
    Credentials({
      credentials: { correo: {}, clave: {} },
      async authorize(datos) {
        const correo = String(datos.correo ?? '').toLowerCase().trim()
        const clave = String(datos.clave ?? '')
        const usuario = await prisma.usuario.findUnique({ where: { correo } })
        if (!usuario) return null
        if (!(await bcrypt.compare(clave, usuario.claveHash))) return null
        return { id: usuario.id, name: usuario.nombre, email: usuario.correo }
      },
    }),
  ],
})

export async function usuarioActual(): Promise<{ id: string; nombre: string }> {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error('Sin sesión')
  return { id: sesion.user.id, nombre: sesion.user.name ?? '' }
}
```

- [ ] **Step 2: Proteger todas las rutas menos la de entrada**

Crear `src/middleware.ts`:

```ts
export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/((?!entrar|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 3: Crear el script de alta de usuarios**

No hay registro público: son dos cuentas fijas creadas desde la terminal.

Crear `scripts/crear-usuario.ts`:

```ts
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const [nombre, correo, clave] = process.argv.slice(2)

if (!nombre || !correo || !clave) {
  console.error('Uso: npx tsx scripts/crear-usuario.ts "Nombre" correo@ejemplo.com clave')
  process.exit(1)
}

async function main() {
  await prisma.usuario.create({
    data: {
      nombre,
      correo: correo.toLowerCase().trim(),
      claveHash: await bcrypt.hash(clave, 12),
    },
  })
  console.log(`Usuario ${correo} creado.`)
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Crear la pantalla de entrada**

Crear `src/app/entrar/page.tsx`:

```tsx
import { signIn } from '@/auth'

export default function Entrar() {
  async function entrar(datos: FormData) {
    'use server'
    await signIn('credentials', {
      correo: datos.get('correo'),
      clave: datos.get('clave'),
      redirectTo: '/',
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F4EC] p-6">
      <form action={entrar} className="w-full max-w-sm space-y-4">
        <h1 className="font-serif text-3xl text-[#1B5E3F]">SOFÍA</h1>
        <p className="text-sm text-[#23201B]/70">Finca Santa Verónica</p>
        <input
          name="correo"
          type="email"
          required
          placeholder="Correo"
          className="w-full rounded border border-[#8B5E3C]/30 bg-white p-3"
        />
        <input
          name="clave"
          type="password"
          required
          placeholder="Clave"
          className="w-full rounded border border-[#8B5E3C]/30 bg-white p-3"
        />
        <button className="w-full rounded bg-[#1B5E3F] p-3 font-medium text-white">Entrar</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Verificar a mano**

```bash
npx tsx scripts/crear-usuario.ts "Joseph" joseph@ejemplo.com claveDePrueba
npm run dev
```

Abrir `http://localhost:3000`. Expected: redirige a `/entrar`. Con credenciales correctas entra; con incorrectas se queda.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: autenticación por credenciales para las dos cuentas de la finca"
```

---

## Task 13: Diseño base y componentes de número

**Files:**
- Create: `src/app/globals.css`
- Create: `src/ui/Cifra.tsx`
- Create: `src/ui/Semaforo.tsx`
- Create: `src/ui/formato.ts`
- Test: `src/ui/formato.test.ts`

**Interfaces:**
- Consumes: `Clasificacion` de `src/calc/clasificacion.ts`
- Produces: `formatearGdp(gdp: number | null): string`; `formatearKg(kg: number | null): string`; `formatearPesos(cop: number): string`; componentes `<Cifra>` y `<Semaforo>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/ui/formato.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatearGdp, formatearKg, formatearPesos } from './formato'

describe('formatearGdp', () => {
  it('muestra gramos por día con separador de miles', () => {
    expect(formatearGdp(1250)).toBe('1.250 g/día')
  })

  it('muestra una raya cuando no hay dato', () => {
    expect(formatearGdp(null)).toBe('—')
  })

  it('conserva el signo de una pérdida', () => {
    expect(formatearGdp(-200)).toBe('-200 g/día')
  })
})

describe('formatearKg', () => {
  it('muestra un decimal', () => {
    expect(formatearKg(226.4)).toBe('226,4 kg')
  })

  it('muestra una raya cuando no hay dato', () => {
    expect(formatearKg(null)).toBe('—')
  })
})

describe('formatearPesos', () => {
  it('muestra pesos colombianos sin decimales', () => {
    expect(formatearPesos(54760000)).toBe('$54.760.000')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/ui/formato.test.ts`
Expected: FAIL — `Failed to resolve import "./formato"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/ui/formato.ts`:

```ts
const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const SIN_DATO = '—'

export function formatearGdp(gdp: number | null): string {
  if (gdp === null) return SIN_DATO
  return `${enteros.format(gdp)} g/día`
}

export function formatearKg(kg: number | null): string {
  if (kg === null) return SIN_DATO
  return `${unDecimal.format(kg)} kg`
}

export function formatearPesos(cop: number): string {
  return `$${enteros.format(cop)}`
}
```

- [ ] **Step 4: Escribir los componentes y el tema**

Reemplazar `src/app/globals.css`:

```css
@import 'tailwindcss';

@theme {
  --color-pasto: #1b5e3f;
  --color-pasto-medio: #2e8b57;
  --color-pasto-claro: #a8d5ba;
  --color-tierra: #8b5e3c;
  --color-crema: #f7f4ec;
  --color-carbon: #23201b;
  --color-ambar: #d98324;
  --color-rojo-tierra: #a63d40;
}

@theme {
  --font-serif: var(--font-titulos), Georgia, serif;
  --font-sans: var(--font-interfaz), system-ui, sans-serif;
}

body {
  background-color: var(--color-crema);
  color: var(--color-carbon);
  font-family: var(--font-sans);
}

/* Obligatorio: sin cifras tabulares una tabla de 56 animales es ilegible. */
.cifra {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

Crear `src/ui/Cifra.tsx`:

```tsx
export function Cifra({
  valor,
  etiqueta,
  comparacion,
  proyectado = false,
}: {
  valor: string
  etiqueta: string
  comparacion?: string
  proyectado?: boolean
}) {
  return (
    <div className="rounded-lg border border-tierra/20 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-carbon/60">{etiqueta}</div>
      <div
        className={`cifra text-3xl font-semibold ${
          proyectado ? 'text-ambar italic' : 'text-pasto'
        }`}
      >
        {valor}
      </div>
      {proyectado && <div className="text-xs text-ambar">proyectado</div>}
      {comparacion && <div className="mt-1 text-xs text-carbon/60">{comparacion}</div>}
    </div>
  )
}
```

Crear `src/ui/Semaforo.tsx`:

```tsx
import type { Clasificacion } from '@/calc/clasificacion'

const ESTILOS: Record<Clasificacion, { texto: string; clase: string }> = {
  excelente: { texto: 'Excelente', clase: 'bg-pasto text-white' },
  bueno: { texto: 'Bueno', clase: 'bg-pasto-medio text-white' },
  normal: { texto: 'Normal', clase: 'bg-pasto-claro text-carbon' },
  bajo: { texto: 'Bajo', clase: 'bg-ambar text-white' },
  critico: { texto: 'Crítico', clase: 'bg-rojo-tierra text-white' },
  sin_dato: { texto: 'Sin dato', clase: 'bg-carbon/10 text-carbon/60' },
}

export function Semaforo({ clasificacion }: { clasificacion: Clasificacion }) {
  const { texto, clase } = ESTILOS[clasificacion]
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>
  )
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm test src/ui/formato.test.ts`
Expected: PASS — 6 pruebas

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: paleta, formato de cifras en español de Colombia y semáforo de desempeño"
```

---

## Task 14: Potreros y lotes

**Files:**
- Create: `src/datos/potreros.ts`
- Create: `src/datos/lotes.ts`
- Create: `src/app/potreros/page.tsx`
- Test: `src/datos/lotes.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `aFechaISO`, `hoyBogota`, `diasOcupacion`, `diasDescanso`, `evaluarCapacidad`
- Produces: `listarPotreros(hoy: FechaISO): Promise<PotreroVista[]>` con `type PotreroVista = { id: string; nombre: string; hectareas: number; capacidadKg: number; loteActual: string | null; diasOcupacion: number | null; diasDescanso: number | null; pesoVivoKg: number; estadoCapacidad: EstadoCapacidad }`; `crearLote(datos: { nombre: string; tipo: TipoLote; fechaApertura: FechaISO }): Promise<string>`; `listarLotes(): Promise<LoteVista[]>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/lotes.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { crearLote, listarLotes } from './lotes'

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.movimiento.deleteMany()
  await prisma.lote.deleteMany()
})

describe('crearLote', () => {
  it('crea un lote y lo devuelve en el listado', async () => {
    await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    const lotes = await listarLotes()
    expect(lotes).toHaveLength(1)
    expect(lotes[0].nombre).toBe('Ceba 01')
    expect(lotes[0].tipo).toBe('ceba')
    expect(lotes[0].animalesActivos).toBe(0)
  })

  it('rechaza dos lotes con el mismo nombre', async () => {
    await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await expect(
      crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-02' }),
    ).rejects.toThrow()
  })

  it('acepta lotes de leche, que no engordan pero comen pasto', async () => {
    await crearLote({ nombre: 'Leche', tipo: 'leche', fechaApertura: '2026-09-01' })
    const lotes = await listarLotes()
    expect(lotes[0].tipo).toBe('leche')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/lotes.test.ts`
Expected: FAIL — `Failed to resolve import "./lotes"`

- [ ] **Step 3: Escribir la capa de datos**

Crear `src/datos/lotes.ts`:

```ts
import type { TipoLote } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

export type LoteVista = {
  id: string
  nombre: string
  tipo: TipoLote
  fechaApertura: FechaISO
  potreroActual: string | null
  animalesActivos: number
}

export async function crearLote(datos: {
  nombre: string
  tipo: TipoLote
  fechaApertura: FechaISO
}): Promise<string> {
  const lote = await prisma.lote.create({
    data: {
      nombre: datos.nombre,
      tipo: datos.tipo,
      fechaApertura: aFechaDb(datos.fechaApertura),
    },
  })
  return lote.id
}

export async function listarLotes(): Promise<LoteVista[]> {
  const lotes = await prisma.lote.findMany({
    where: { fechaCierre: null },
    include: {
      potreroActual: { select: { nombre: true } },
      _count: { select: { animales: { where: { estado: 'activo' } } } },
    },
    orderBy: { nombre: 'asc' },
  })

  return lotes.map((lote) => ({
    id: lote.id,
    nombre: lote.nombre,
    tipo: lote.tipo,
    fechaApertura: aFechaISO(lote.fechaApertura),
    potreroActual: lote.potreroActual?.nombre ?? null,
    animalesActivos: lote._count.animales,
  }))
}
```

Crear `src/datos/potreros.ts`:

```ts
import type { EstadoCapacidad } from '@/calc/potrero'
import { diasDescanso, diasOcupacion, evaluarCapacidad } from '@/calc/potrero'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aNumero } from './conversion'
import { pesoVivoPorLote } from './pesajes'

export type PotreroVista = {
  id: string
  nombre: string
  hectareas: number
  capacidadKg: number
  loteActual: string | null
  diasOcupacion: number | null
  diasDescanso: number | null
  pesoVivoKg: number
  estadoCapacidad: EstadoCapacidad
}

export async function listarPotreros(hoy: FechaISO): Promise<PotreroVista[]> {
  const potreros = await prisma.potrero.findMany({
    where: { anuladoEn: null },
    include: { lotes: { select: { id: true, nombre: true, fechaEntradaPotrero: true } } },
    orderBy: { nombre: 'asc' },
  })

  const pesos = await pesoVivoPorLote()

  const ultimaSalida = new Map<string, FechaISO>()
  const salidas = await prisma.movimiento.findMany({
    where: { potreroOrigenId: { not: null } },
    orderBy: { fecha: 'desc' },
  })
  for (const salida of salidas) {
    if (salida.potreroOrigenId && !ultimaSalida.has(salida.potreroOrigenId)) {
      ultimaSalida.set(salida.potreroOrigenId, aFechaISO(salida.fecha))
    }
  }

  return potreros.map((potrero) => {
    const lote = potrero.lotes[0] ?? null
    const pesoVivoKg = lote ? (pesos.get(lote.id) ?? 0) : 0
    return {
      id: potrero.id,
      nombre: potrero.nombre,
      hectareas: aNumero(potrero.hectareas),
      capacidadKg: potrero.capacidadKg,
      loteActual: lote?.nombre ?? null,
      diasOcupacion:
        lote?.fechaEntradaPotrero ? diasOcupacion(aFechaISO(lote.fechaEntradaPotrero), hoy) : null,
      diasDescanso: lote ? null : diasDescanso(ultimaSalida.get(potrero.id) ?? null, hoy),
      pesoVivoKg,
      estadoCapacidad: evaluarCapacidad(pesoVivoKg, potrero.capacidadKg),
    }
  })
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/lotes.test.ts`
Expected: PASS — 3 pruebas

Nota: `pesoVivoPorLote` se implementa en la tarea 16. Hasta entonces, crear en `src/datos/pesajes.ts` la firma con un cuerpo que devuelva `new Map<string, number>()` para que compile, y completarla allí.

- [ ] **Step 5: Escribir las pantallas**

Crear `src/app/potreros/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { listarPotreros } from '@/datos/potreros'
import { formatearKg } from '@/ui/formato'

const ETIQUETA_CAPACIDAD = {
  holgado: { texto: 'Holgado', clase: 'text-pasto' },
  ajustado: { texto: 'Ajustado', clase: 'text-ambar' },
  sobrecargado: { texto: 'Sobrecargado', clase: 'text-rojo-tierra font-semibold' },
}

export default async function Potreros() {
  const potreros = await listarPotreros(hoyBogota())

  return (
    <main className="p-6">
      <h1 className="mb-6 font-serif text-3xl text-pasto">Potreros</h1>
      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Potrero</th>
            <th className="p-2">Hectáreas</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Ocupación</th>
            <th className="p-2">Descanso</th>
            <th className="p-2">Peso vivo</th>
            <th className="p-2">Capacidad</th>
          </tr>
        </thead>
        <tbody>
          {potreros.map((potrero) => (
            <tr key={potrero.id} className="border-b border-tierra/10">
              <td className="p-2">{potrero.nombre}</td>
              <td className="cifra p-2">{potrero.hectareas}</td>
              <td className="p-2">{potrero.loteActual ?? '—'}</td>
              <td className="cifra p-2">
                {potrero.diasOcupacion === null ? '—' : `${potrero.diasOcupacion} días`}
              </td>
              <td className="cifra p-2">
                {potrero.diasDescanso === null ? '—' : `${potrero.diasDescanso} días`}
              </td>
              <td className="cifra p-2">{formatearKg(potrero.pesoVivoKg)}</td>
              <td className={`p-2 ${ETIQUETA_CAPACIDAD[potrero.estadoCapacidad].clase}`}>
                {ETIQUETA_CAPACIDAD[potrero.estadoCapacidad].texto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: potreros y lotes con días de ocupación, descanso y estado de capacidad"
```

---

## Task 15: Alta de animales con chapeta

**Files:**
- Create: `src/datos/animales.ts`
- Create: `src/app/lotes/page.tsx`
- Create: `src/app/lotes/acciones.ts`
- Test: `src/datos/animales.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `aFechaISO`, `aKg`
- Produces: `crearAnimales(datos: DatosAlta): Promise<number>` con `type DatosAlta = { loteId: string; chapetas: string[]; sexo: string; raza: string | null; cruce: string | null; proveedor: string | null; fechaEntrada: FechaISO; edadEntradaMeses: number | null; pesos: Record<string, number> }`; `listarAnimalesDeLote(loteId: string): Promise<AnimalVista[]>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/animales.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'

let loteId: string

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
})

describe('crearAnimales', () => {
  it('crea un animal por chapeta con su peso de entrada', async () => {
    const creados = await crearAnimales({
      loteId,
      chapetas: ['001', '002'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: 'Feria Sabanalarga',
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '001': 150, '002': 158.5 },
    })

    expect(creados).toBe(2)
    const animales = await listarAnimalesDeLote(loteId)
    expect(animales).toHaveLength(2)
    expect(animales[0].chapeta).toBe('001')
    expect(animales[0].pesoEntradaKg).toBe(150)
    expect(animales[1].pesoEntradaKg).toBe(158.5)
    expect(animales[0].estado).toBe('activo')
  })

  it('rechaza una chapeta repetida en la finca', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })

    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-02',
        edadEntradaMeses: null,
        pesos: { '001': 152 },
      }),
    ).rejects.toThrow()
  })

  it('rechaza una chapeta sin peso de entrada', async () => {
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '002'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150 },
      }),
    ).rejects.toThrow('002')
  })

  it('no crea ningún animal si uno falla', async () => {
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '002'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150, '002': 0 },
      }),
    ).rejects.toThrow()

    expect(await listarAnimalesDeLote(loteId)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/animales.test.ts`
Expected: FAIL — `Failed to resolve import "./animales"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/animales.ts`:

```ts
import type { EstadoAnimal } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO, aKg } from './conversion'

export type DatosAlta = {
  loteId: string
  chapetas: string[]
  sexo: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  edadEntradaMeses: number | null
  pesos: Record<string, number>
}

export type AnimalVista = {
  id: string
  chapeta: string
  loteId: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  pesoEntradaKg: number
  estado: EstadoAnimal
}

/**
 * Da de alta un lote completo en una sola transacción.
 * O entran todos o no entra ninguno: un alta a medias deja el lote descuadrado
 * y obliga a adivinar cuáles chapetas faltaron.
 */
export async function crearAnimales(datos: DatosAlta): Promise<number> {
  for (const chapeta of datos.chapetas) {
    const peso = datos.pesos[chapeta]
    if (peso === undefined) {
      throw new Error(`Falta el peso de entrada de la chapeta ${chapeta}.`)
    }
    if (peso <= 0) {
      throw new Error(`El peso de entrada de la chapeta ${chapeta} debe ser mayor que cero.`)
    }
  }

  await prisma.$transaction(
    datos.chapetas.map((chapeta) =>
      prisma.animal.create({
        data: {
          chapeta,
          loteId: datos.loteId,
          sexo: datos.sexo,
          raza: datos.raza,
          cruce: datos.cruce,
          proveedor: datos.proveedor,
          fechaEntrada: aFechaDb(datos.fechaEntrada),
          edadEntradaMeses: datos.edadEntradaMeses,
          pesoEntradaKg: datos.pesos[chapeta],
        },
      }),
    ),
  )

  return datos.chapetas.length
}

export async function listarAnimalesDeLote(loteId: string): Promise<AnimalVista[]> {
  const animales = await prisma.animal.findMany({
    where: { loteId },
    orderBy: { chapeta: 'asc' },
  })

  return animales.map((animal) => ({
    id: animal.id,
    chapeta: animal.chapeta,
    loteId: animal.loteId,
    raza: animal.raza,
    cruce: animal.cruce,
    proveedor: animal.proveedor,
    fechaEntrada: aFechaISO(animal.fechaEntrada),
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    estado: animal.estado,
  }))
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/animales.test.ts`
Expected: PASS — 4 pruebas

- [ ] **Step 5: Escribir las acciones de alta**

Crear `src/app/lotes/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import type { TipoLote } from '@prisma/client'
import { crearAnimales } from '@/datos/animales'
import { crearLote } from '@/datos/lotes'

export async function crearLoteAccion(datos: FormData) {
  await crearLote({
    nombre: String(datos.get('nombre')),
    tipo: String(datos.get('tipo')) as TipoLote,
    fechaApertura: String(datos.get('fechaApertura')),
  })
  revalidatePath('/lotes')
}

/**
 * Recibe un bloque de texto con una línea por animal: `chapeta peso`.
 * Es la forma más rápida de vaciar la planilla del día de la compra, que es
 * cuando se chapetea y se pesa el lote entero de una sola vez.
 */
export async function crearAnimalesAccion(datos: FormData) {
  const lineas = String(datos.get('planilla'))
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')

  const chapetas: string[] = []
  const pesos: Record<string, number> = {}

  for (const linea of lineas) {
    const [chapeta, peso] = linea.split(/[\s,;]+/)
    if (!chapeta || !peso) {
      throw new Error(`Línea mal formada: "${linea}". Se espera "chapeta peso".`)
    }
    chapetas.push(chapeta)
    pesos[chapeta] = Number(peso.replace(',', '.'))
  }

  await crearAnimales({
    loteId: String(datos.get('loteId')),
    chapetas,
    sexo: String(datos.get('sexo')),
    raza: (String(datos.get('raza')) || null) as string | null,
    cruce: (String(datos.get('cruce')) || null) as string | null,
    proveedor: (String(datos.get('proveedor')) || null) as string | null,
    fechaEntrada: String(datos.get('fechaEntrada')),
    edadEntradaMeses: datos.get('edadEntradaMeses') ? Number(datos.get('edadEntradaMeses')) : null,
    pesos,
  })

  revalidatePath('/lotes')
  revalidatePath('/como-vamos')
}
```

- [ ] **Step 6: Escribir la pantalla de lotes**

Crear `src/app/lotes/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { listarLotes } from '@/datos/lotes'
import { crearAnimalesAccion, crearLoteAccion } from './acciones'

export default async function Lotes() {
  const lotes = await listarLotes()
  const hoy = hoyBogota()

  return (
    <main className="p-6">
      <h1 className="mb-6 font-serif text-3xl text-pasto">Lotes</h1>

      <table className="mb-8 w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Lote</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Abierto</th>
            <th className="p-2">Potrero</th>
            <th className="p-2">Animales</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote) => (
            <tr key={lote.id} className="border-b border-tierra/10">
              <td className="p-2 font-medium">{lote.nombre}</td>
              <td className="p-2">{lote.tipo}</td>
              <td className="cifra p-2">{lote.fechaApertura}</td>
              <td className="p-2">{lote.potreroActual ?? '—'}</td>
              <td className="cifra p-2">{lote.animalesActivos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Abrir un lote</h2>
        <form action={crearLoteAccion} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Nombre
            <input name="nombre" required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <label className="text-sm">
            Tipo
            <select name="tipo" defaultValue="ceba" className="ml-2 rounded border border-tierra/30 p-2">
              <option value="ceba">Ceba</option>
              <option value="leche">Leche</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input name="fechaApertura" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <button className="rounded bg-pasto px-4 py-2 text-white">Abrir lote</button>
        </form>
      </section>

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-1 font-serif text-xl text-pasto">Dar de alta animales</h2>
        <p className="mb-3 text-sm text-carbon/70">
          Una línea por animal, con la chapeta y el peso de entrada separados por un espacio.
          O entran todos o no entra ninguno.
        </p>
        <form action={crearAnimalesAccion} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Lote
              <select name="loteId" required className="ml-2 rounded border border-tierra/30 p-2">
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Sexo
              <select name="sexo" defaultValue="macho" className="ml-2 rounded border border-tierra/30 p-2">
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </label>
            <label className="text-sm">
              Raza
              <input name="raza" className="ml-2 w-32 rounded border border-tierra/30 p-2" />
            </label>
            <label className="text-sm">
              Cruce
              <input name="cruce" className="ml-2 w-32 rounded border border-tierra/30 p-2" />
            </label>
            <label className="text-sm">
              Proveedor
              <input name="proveedor" className="ml-2 w-40 rounded border border-tierra/30 p-2" />
            </label>
            <label className="text-sm">
              Edad al entrar (meses)
              <input name="edadEntradaMeses" type="number" className="cifra ml-2 w-20 rounded border border-tierra/30 p-2" />
            </label>
            <label className="text-sm">
              Fecha de entrada
              <input name="fechaEntrada" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
            </label>
          </div>
          <textarea
            name="planilla"
            required
            rows={10}
            placeholder={'001 150\n002 158,5\n003 147'}
            className="cifra w-full rounded border border-tierra/30 p-3 font-mono"
          />
          <button className="rounded bg-pasto px-6 py-3 font-medium text-white">
            Dar de alta el lote
          </button>
        </form>
      </section>
    </main>
  )
}
```

- [ ] **Step 7: Verificar a mano**

Run: `npm run dev`, abrir `/lotes`. Abrir un lote llamado "Ceba 01", y pegar tres líneas en la planilla.
Expected: los tres animales aparecen en el conteo del lote y en `/digitar`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: alta transaccional de animales con chapeta y peso de entrada"
```

---

## Task 16: Pesajes en tanda

**Files:**
- Create: `src/datos/pesajes.ts`
- Test: `src/datos/pesajes.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `aFechaISO`, `aKg`, `validarMedicion`, `gdpEntre`, `Medicion` de `src/calc/gdp.ts`
- Produces: `historialDeAnimal(animalId: string): Promise<Medicion[]>`; `revisarTanda(entradas: EntradaTanda[], fecha: FechaISO): Promise<RevisionTanda[]>`; `guardarPesaje(datos: DatosPesaje): Promise<string>`; `pesoVivoPorLote(): Promise<Map<string, number>>`; `ultimoPesoPorAnimal(): Promise<Map<string, Medicion>>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/pesajes.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { guardarPesaje, pesoVivoPorLote, revisarTanda, ultimoPesoPorAnimal } from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002'],
    sexo: 'macho',
    raza: 'Brahman',
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: 14,
    pesos: { '001': 150, '002': 150 },
  })

  const animales = await listarAnimalesDeLote(loteId)
  idPorChapeta = Object.fromEntries(animales.map((a) => [a.chapeta, a.id]))
})

describe('revisarTanda', () => {
  it('devuelve la ganancia diaria que resultaría de cada peso digitado', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      '2026-10-01',
    )
    expect(revision[0].gdp).toBe(800)
    expect(revision[0].nivel).toBe('ok')
  })

  it('advierte por una ganancia imposible sin bloquear el guardado', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 400 }],
      '2026-10-01',
    )
    expect(revision[0].nivel).toBe('advertencia')
    expect(revision[0].mensaje).toContain('g/día')
  })

  it('rechaza un pesaje anterior al ingreso del animal', async () => {
    const revision = await revisarTanda(
      [{ animalId: idPorChapeta['001'], pesoKg: 150 }],
      '2026-08-01',
    )
    expect(revision[0].nivel).toBe('rechazo')
  })
})

describe('guardarPesaje', () => {
  it('guarda una sesión con solo algunos animales del lote', async () => {
    const pesajeId = await guardarPesaje({
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
    })

    expect(pesajeId).toBeTruthy()
    const ultimos = await ultimoPesoPorAnimal()
    expect(ultimos.get(idPorChapeta['001'])).toEqual({ fecha: '2026-10-01', pesoKg: 174 })
    expect(ultimos.has(idPorChapeta['002'])).toBe(false)
  })

  it('no guarda nada si alguna medición es rechazable', async () => {
    await expect(
      guardarPesaje({
        fecha: '2026-08-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
      }),
    ).rejects.toThrow()

    expect(await prisma.pesaje.count()).toBe(0)
  })

  it('guarda aunque haya advertencias, porque la pérdida de peso puede ser real', async () => {
    const pesajeId = await guardarPesaje({
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: 'Verano fuerte',
      registradoPorId: 'u1',
      mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 120 }],
    })
    expect(pesajeId).toBeTruthy()
  })
})

describe('pesoVivoPorLote', () => {
  it('usa el último peso medido de cada animal y el de entrada si nunca se pesó', async () => {
    await guardarPesaje({
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 174 }],
    })

    const pesos = await pesoVivoPorLote()
    expect(pesos.get(loteId)).toBe(324)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/pesajes.test.ts`
Expected: FAIL — `revisarTanda is not a function`

- [ ] **Step 3: Escribir la implementación**

Reemplazar `src/datos/pesajes.ts`:

```ts
import type { MetodoPesaje } from '@prisma/client'
import type { Medicion } from '@/calc/gdp'
import type { FechaISO } from '@/calc/tipos'
import { validarMedicion, type Nivel } from '@/calc/validacion'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO, aKg } from './conversion'

export type EntradaTanda = { animalId: string; pesoKg: number }

export type RevisionTanda = {
  animalId: string
  chapeta: string
  nivel: Nivel
  mensaje: string
  gdp: number | null
}

export type DatosPesaje = {
  fecha: FechaISO
  metodo: MetodoPesaje
  responsable: string
  notas: string | null
  registradoPorId: string
  mediciones: EntradaTanda[]
}

export async function historialDeAnimal(animalId: string): Promise<Medicion[]> {
  const filas = await prisma.medicion.findMany({
    where: { animalId, pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
    orderBy: { pesaje: { fecha: 'asc' } },
  })
  return filas.map((fila) => ({ fecha: aFechaISO(fila.pesaje.fecha), pesoKg: aKg(fila.pesoKg) }))
}

/**
 * Evalúa una tanda completa antes de guardarla y devuelve, por animal, la ganancia
 * diaria que resultaría. Es lo que se le muestra al usuario para que cace el dedazo
 * en el momento, y no tres meses después cuando ya contaminó el costo por kilogramo.
 */
export async function revisarTanda(
  entradas: EntradaTanda[],
  fecha: FechaISO,
): Promise<RevisionTanda[]> {
  const animales = await prisma.animal.findMany({
    where: { id: { in: entradas.map((e) => e.animalId) } },
    select: { id: true, chapeta: true, fechaEntrada: true, pesoEntradaKg: true },
  })
  const porId = new Map(animales.map((a) => [a.id, a]))

  return Promise.all(
    entradas.map(async (entrada) => {
      const animal = porId.get(entrada.animalId)
      if (!animal) {
        return {
          animalId: entrada.animalId,
          chapeta: '?',
          nivel: 'rechazo' as const,
          mensaje: 'El animal no existe.',
          gdp: null,
        }
      }

      const historial = await historialDeAnimal(animal.id)
      const anteriores = historial.filter((m) => m.fecha < fecha)
      const anterior = anteriores.at(-1) ?? null

      const veredicto = validarMedicion(
        { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) },
        anterior,
        { fecha, pesoKg: entrada.pesoKg },
      )

      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        nivel: veredicto.nivel,
        mensaje: veredicto.mensaje,
        gdp: veredicto.gdp,
      }
    }),
  )
}

export async function guardarPesaje(datos: DatosPesaje): Promise<string> {
  const revision = await revisarTanda(datos.mediciones, datos.fecha)
  const rechazos = revision.filter((r) => r.nivel === 'rechazo')
  if (rechazos.length > 0) {
    throw new Error(
      `No se guardó nada. ${rechazos.length} medición(es) rechazada(s): ` +
        rechazos.map((r) => `${r.chapeta} — ${r.mensaje}`).join(' | '),
    )
  }

  const pesaje = await prisma.pesaje.create({
    data: {
      fecha: aFechaDb(datos.fecha),
      metodo: datos.metodo,
      responsable: datos.responsable,
      notas: datos.notas,
      registradoPorId: datos.registradoPorId,
      mediciones: {
        create: datos.mediciones.map((m) => ({ animalId: m.animalId, pesoKg: m.pesoKg })),
      },
    },
  })

  return pesaje.id
}

export async function ultimoPesoPorAnimal(): Promise<Map<string, Medicion>> {
  const filas = await prisma.medicion.findMany({
    where: { pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
    orderBy: { pesaje: { fecha: 'asc' } },
  })

  const ultimo = new Map<string, Medicion>()
  for (const fila of filas) {
    ultimo.set(fila.animalId, { fecha: aFechaISO(fila.pesaje.fecha), pesoKg: aKg(fila.pesoKg) })
  }
  return ultimo
}

/**
 * Peso vivo de cada lote. Un animal sin ningún pesaje cuenta con su peso de entrada:
 * excluirlo subestimaría la carga sobre el potrero, que es una alerta de manejo real.
 */
export async function pesoVivoPorLote(): Promise<Map<string, number>> {
  const animales = await prisma.animal.findMany({
    where: { estado: 'activo' },
    select: { id: true, loteId: true, pesoEntradaKg: true },
  })
  const ultimos = await ultimoPesoPorAnimal()

  const total = new Map<string, number>()
  for (const animal of animales) {
    const peso = ultimos.get(animal.id)?.pesoKg ?? aKg(animal.pesoEntradaKg)
    total.set(animal.loteId, (total.get(animal.loteId) ?? 0) + peso)
  }
  return total
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/pesajes.test.ts`
Expected: PASS — 7 pruebas

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pesajes en tanda con revisión previa y guardado transaccional"
```

---

## Task 17: Pantalla Digitar

**Files:**
- Create: `src/app/digitar/page.tsx`
- Create: `src/app/digitar/acciones.ts`
- Create: `src/app/digitar/TablaPesaje.tsx`

**Interfaces:**
- Consumes: `listarLotes`, `listarAnimalesDeLote`, `revisarTanda`, `guardarPesaje`, `usuarioActual`, `hoyBogota`, `formatearGdp`
- Produces: acciones de servidor `revisarAccion(estado, datos: FormData)` y `guardarAccion(estado, datos: FormData)`

Esta es la pantalla que decide si el sistema vive. Se digita con el teclado, de arriba abajo, sin mouse.

- [ ] **Step 1: Escribir las acciones de servidor**

Crear `src/app/digitar/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import type { MetodoPesaje } from '@prisma/client'
import { usuarioActual } from '@/auth'
import { guardarPesaje, revisarTanda, type RevisionTanda } from '@/datos/pesajes'

export type EstadoDigitacion = {
  revision: RevisionTanda[]
  guardado: boolean
  error: string | null
}

/** Lee los campos `peso_<animalId>` del formulario, ignorando los vacíos. */
function leerEntradas(datos: FormData) {
  const entradas: { animalId: string; pesoKg: number }[] = []
  for (const [campo, valor] of datos.entries()) {
    if (!campo.startsWith('peso_')) continue
    const texto = String(valor).trim().replace(',', '.')
    if (texto === '') continue
    entradas.push({ animalId: campo.slice('peso_'.length), pesoKg: Number(texto) })
  }
  return entradas
}

export async function revisarAccion(
  _estado: EstadoDigitacion,
  datos: FormData,
): Promise<EstadoDigitacion> {
  const fecha = String(datos.get('fecha'))
  const entradas = leerEntradas(datos)
  if (entradas.length === 0) {
    return { revision: [], guardado: false, error: 'No hay ningún peso digitado.' }
  }
  return { revision: await revisarTanda(entradas, fecha), guardado: false, error: null }
}

export async function guardarAccion(
  _estado: EstadoDigitacion,
  datos: FormData,
): Promise<EstadoDigitacion> {
  const usuario = await usuarioActual()
  try {
    await guardarPesaje({
      fecha: String(datos.get('fecha')),
      metodo: String(datos.get('metodo')) as MetodoPesaje,
      responsable: String(datos.get('responsable')),
      notas: (String(datos.get('notas')) || null) as string | null,
      registradoPorId: usuario.id,
      mediciones: leerEntradas(datos),
    })
    revalidatePath('/como-vamos')
    revalidatePath('/')
    return { revision: [], guardado: true, error: null }
  } catch (error) {
    return { revision: [], guardado: false, error: (error as Error).message }
  }
}
```

- [ ] **Step 2: Escribir la tabla de digitación**

Crear `src/app/digitar/TablaPesaje.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { guardarAccion, revisarAccion, type EstadoDigitacion } from './acciones'
import { formatearGdp } from '@/ui/formato'

const INICIAL: EstadoDigitacion = { revision: [], guardado: false, error: null }

const COLOR_NIVEL = {
  ok: 'text-pasto',
  advertencia: 'text-ambar',
  rechazo: 'text-rojo-tierra font-semibold',
}

export function TablaPesaje({
  animales,
  hoy,
}: {
  animales: { id: string; chapeta: string }[]
  hoy: string
}) {
  const [estado, revisar, revisando] = useActionState(revisarAccion, INICIAL)
  const [guardadoEstado, guardar, guardando] = useActionState(guardarAccion, INICIAL)

  const porAnimal = new Map(estado.revision.map((r) => [r.animalId, r]))
  const hayRechazos = estado.revision.some((r) => r.nivel === 'rechazo')
  const yaRevisado = estado.revision.length > 0

  return (
    <form action={yaRevisado && !hayRechazos ? guardar : revisar} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Fecha
          <input name="fecha" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
        </label>
        <label className="text-sm">
          Método
          <select name="metodo" defaultValue="cinta" className="ml-2 rounded border border-tierra/30 p-2">
            <option value="cinta">Cinta bovinométrica</option>
            <option value="bascula">Báscula</option>
            <option value="estimacion">Estimación</option>
          </select>
        </label>
        <label className="text-sm">
          Pesó
          <input name="responsable" defaultValue="Joseph" required className="ml-2 rounded border border-tierra/30 p-2" />
        </label>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Chapeta</th>
            <th className="p-2">Peso (kg)</th>
            <th className="p-2">Ganancia que resultaría</th>
          </tr>
        </thead>
        <tbody>
          {animales.map((animal) => {
            const revision = porAnimal.get(animal.id)
            return (
              <tr key={animal.id} className="border-b border-tierra/10">
                <td className="p-2 font-medium">{animal.chapeta}</td>
                <td className="p-2">
                  <input
                    name={`peso_${animal.id}`}
                    inputMode="decimal"
                    autoComplete="off"
                    className="cifra w-24 rounded border border-tierra/30 p-2 text-right"
                  />
                </td>
                <td className={`cifra p-2 ${revision ? COLOR_NIVEL[revision.nivel] : ''}`}>
                  {revision ? `${formatearGdp(revision.gdp)} ${revision.mensaje}` : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <label className="block text-sm">
        Notas
        <input name="notas" className="ml-2 w-96 rounded border border-tierra/30 p-2" />
      </label>

      {estado.error && <p className="text-rojo-tierra">{estado.error}</p>}
      {guardadoEstado.error && <p className="text-rojo-tierra">{guardadoEstado.error}</p>}
      {guardadoEstado.guardado && <p className="text-pasto">Pesaje guardado.</p>}
      {hayRechazos && (
        <p className="text-rojo-tierra">
          Corrige las filas en rojo antes de guardar. No se guardará nada mientras haya rechazos.
        </p>
      )}

      <button
        disabled={revisando || guardando}
        className="rounded bg-pasto px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        {yaRevisado && !hayRechazos ? 'Guardar pesaje' : 'Revisar antes de guardar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Escribir la pantalla**

Crear `src/app/digitar/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { listarAnimalesDeLote } from '@/datos/animales'
import { listarLotes } from '@/datos/lotes'
import { TablaPesaje } from './TablaPesaje'

export default async function Digitar({
  searchParams,
}: {
  searchParams: Promise<{ lote?: string }>
}) {
  const { lote: loteSeleccionado } = await searchParams
  const lotes = await listarLotes()
  const loteId = loteSeleccionado ?? lotes[0]?.id
  const animales = loteId ? await listarAnimalesDeLote(loteId) : []

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Digitar pesaje</h1>
      <p className="mb-6 text-sm text-carbon/70">
        Escribe los pesos de la libreta de arriba abajo. Deja vacías las chapetas que no se pesaron.
      </p>

      <nav className="mb-6 flex gap-2">
        {lotes.map((lote) => (
          <a
            key={lote.id}
            href={`/digitar?lote=${lote.id}`}
            className={`rounded px-3 py-1 text-sm ${
              lote.id === loteId ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {lote.nombre} ({lote.animalesActivos})
          </a>
        ))}
      </nav>

      <TablaPesaje
        animales={animales.filter((a) => a.estado === 'activo')}
        hoy={hoyBogota()}
      />
    </main>
  )
}
```

- [ ] **Step 4: Verificar a mano**

Run: `npm run dev`, abrir `/digitar`.
Expected: se ve la lista de chapetas, se puede bajar con Tab escribiendo pesos, y al pulsar "Revisar" aparece la ganancia diaria que resultaría en cada fila.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pantalla de digitación de pesajes por tanda con revisión previa"
```

---

## Task 18: Pantalla Cómo vamos

**Files:**
- Create: `src/datos/desempeno.ts`
- Create: `src/app/como-vamos/page.tsx`
- Test: `src/datos/desempeno.test.ts`

**Interfaces:**
- Consumes: `prisma`, `historialDeAnimal`, `leerUmbrales`, `gdpEntre`, `gdpAcumulada`, `clasificar`, `promediarGdp`, `diasEntre`
- Produces: `type Periodo = 'ultimo_pesaje' | 'dias_30' | 'dias_60' | 'dias_90' | 'acumulado'`; `type FilaDesempeno = { animalId: string; chapeta: string; lote: string; pesoActualKg: number | null; fechaUltimoPesaje: FechaISO | null; kgGanados: number | null; gdpPeriodo: number | null; gdpAcumulada: number | null; clasificacion: Clasificacion; diasEnFinca: number }`; `desempeno(periodo: Periodo, hoy: FechaISO): Promise<{ filas: FilaDesempeno[]; resumen: ResumenPromedio }>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/desempeno.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { desempeno } from './desempeno'
import { crearLote } from './lotes'
import { guardarParametro } from './parametros'
import { guardarPesaje } from './pesajes'

let loteId: string
let idPorChapeta: Record<string, string>

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.parametro.deleteMany()

  for (const [clave, valor] of Object.entries({
    umbral_excelente: '900',
    umbral_bueno: '750',
    umbral_normal: '600',
    umbral_bajo: '400',
  })) {
    await guardarParametro(clave, valor, '2026-01-01', 'u1')
  }

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002'],
    sexo: 'macho',
    raza: 'Brahman',
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: 14,
    pesos: { '001': 150, '002': 150 },
  })
  const animales = await listarAnimalesDeLote(loteId)
  idPorChapeta = Object.fromEntries(animales.map((a) => [a.chapeta, a.id]))

  await guardarPesaje({
    fecha: '2026-10-01',
    metodo: 'cinta',
    responsable: 'Joseph',
    notas: null,
    registradoPorId: 'u1',
    mediciones: [
      { animalId: idPorChapeta['001'], pesoKg: 174 },
      { animalId: idPorChapeta['002'], pesoKg: 162 },
    ],
  })
  await guardarPesaje({
    fecha: '2026-11-01',
    metodo: 'cinta',
    responsable: 'Joseph',
    notas: null,
    registradoPorId: 'u1',
    mediciones: [{ animalId: idPorChapeta['001'], pesoKg: 202 }],
  })
})

describe('desempeno', () => {
  it('calcula la ganancia del último tramo de cada animal', async () => {
    const { filas } = await desempeno('ultimo_pesaje', '2026-11-15')
    const uno = filas.find((f) => f.chapeta === '001')!
    expect(uno.gdpPeriodo).toBe(903)
    expect(uno.clasificacion).toBe('excelente')
  })

  it('calcula la ganancia acumulada desde la entrada', async () => {
    const { filas } = await desempeno('acumulado', '2026-11-15')
    const uno = filas.find((f) => f.chapeta === '001')!
    expect(uno.gdpAcumulada).toBe(852)
    expect(uno.kgGanados).toBe(52)
  })

  it('separa al animal que no se pesó en la última sesión', async () => {
    const { filas } = await desempeno('ultimo_pesaje', '2026-11-15')
    const dos = filas.find((f) => f.chapeta === '002')!
    expect(dos.fechaUltimoPesaje).toBe('2026-10-01')
    expect(dos.gdpPeriodo).toBe(400)
    expect(dos.clasificacion).toBe('bajo')
  })

  it('reporta el promedio con su n y su cobertura', async () => {
    const { resumen } = await desempeno('acumulado', '2026-11-15')
    expect(resumen.n).toBe(2)
    expect(resumen.total).toBe(2)
    expect(resumen.cobertura).toBe(1)
  })

  it('deja sin dato al animal que nunca se ha pesado', async () => {
    await crearAnimales({
      loteId,
      chapetas: ['003'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '003': 150 },
    })

    const { filas, resumen } = await desempeno('acumulado', '2026-11-15')
    const tres = filas.find((f) => f.chapeta === '003')!
    expect(tres.gdpAcumulada).toBeNull()
    expect(tres.clasificacion).toBe('sin_dato')
    expect(resumen.n).toBe(2)
    expect(resumen.total).toBe(3)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/desempeno.test.ts`
Expected: FAIL — `Failed to resolve import "./desempeno"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/desempeno.ts`:

```ts
import { clasificar, type Clasificacion } from '@/calc/clasificacion'
import { diasEntre } from '@/calc/fechas'
import { gdpAcumulada, gdpEntre, type Medicion } from '@/calc/gdp'
import { promediarGdp, type ResumenPromedio } from '@/calc/lote'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aKg } from './conversion'
import { leerUmbrales } from './parametros'
import { historialDeAnimal } from './pesajes'

export type Periodo = 'ultimo_pesaje' | 'dias_30' | 'dias_60' | 'dias_90' | 'acumulado'

const VENTANA: Record<Exclude<Periodo, 'ultimo_pesaje' | 'acumulado'>, number> = {
  dias_30: 30,
  dias_60: 60,
  dias_90: 90,
}

export type FilaDesempeno = {
  animalId: string
  chapeta: string
  lote: string
  pesoActualKg: number | null
  fechaUltimoPesaje: FechaISO | null
  kgGanados: number | null
  gdpPeriodo: number | null
  gdpAcumulada: number | null
  clasificacion: Clasificacion
  diasEnFinca: number
}

/**
 * Elige contra qué medición se compara el último peso, según el periodo pedido.
 * Para las ventanas de días se usa el pesaje más viejo dentro de la ventana:
 * comparar contra uno anterior a la ventana mediría un tramo que no se pidió.
 */
function referencia(
  historial: Medicion[],
  entrada: Medicion,
  periodo: Periodo,
  hoy: FechaISO,
): Medicion | null {
  if (historial.length === 0) return null
  if (periodo === 'acumulado') return entrada
  if (periodo === 'ultimo_pesaje') return historial.at(-2) ?? entrada

  const dias = VENTANA[periodo]
  const dentro = historial.filter((m) => diasEntre(m.fecha, hoy) <= dias)
  const anteriores = historial.filter((m) => diasEntre(m.fecha, hoy) > dias)
  if (dentro.length >= 2) return dentro[0]
  return anteriores.at(-1) ?? entrada
}

export async function desempeno(
  periodo: Periodo,
  hoy: FechaISO,
): Promise<{ filas: FilaDesempeno[]; resumen: ResumenPromedio }> {
  const umbrales = await leerUmbrales(hoy)

  const animales = await prisma.animal.findMany({
    where: { estado: 'activo', lote: { tipo: 'ceba' } },
    include: { lote: { select: { nombre: true } } },
    orderBy: { chapeta: 'asc' },
  })

  const filas: FilaDesempeno[] = await Promise.all(
    animales.map(async (animal) => {
      const entrada: Medicion = {
        fecha: aFechaISO(animal.fechaEntrada),
        pesoKg: aKg(animal.pesoEntradaKg),
      }
      const historial = await historialDeAnimal(animal.id)
      const ultimo = historial.at(-1) ?? null
      const base = referencia(historial, entrada, periodo, hoy)

      const gdpPeriodo = ultimo && base ? gdpEntre(base, ultimo) : null
      const acumulada = ultimo ? gdpAcumulada(entrada, ultimo) : null

      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        lote: animal.lote.nombre,
        pesoActualKg: ultimo?.pesoKg ?? null,
        fechaUltimoPesaje: ultimo?.fecha ?? null,
        kgGanados: ultimo ? Math.round((ultimo.pesoKg - entrada.pesoKg) * 10) / 10 : null,
        gdpPeriodo,
        gdpAcumulada: acumulada,
        clasificacion: clasificar(gdpPeriodo, umbrales),
        diasEnFinca: diasEntre(entrada.fecha, hoy),
      }
    }),
  )

  const resumen = promediarGdp(
    filas.map((f) => (periodo === 'acumulado' ? f.gdpAcumulada : f.gdpPeriodo)),
    filas.length,
  )

  return { filas, resumen }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/desempeno.test.ts`
Expected: PASS — 5 pruebas

- [ ] **Step 5: Escribir la pantalla**

Crear `src/app/como-vamos/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { desempeno, type Periodo } from '@/datos/desempeno'
import { leerParametro } from '@/datos/parametros'
import { Cifra } from '@/ui/Cifra'
import { Semaforo } from '@/ui/Semaforo'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'ultimo_pesaje', texto: 'Desde el último pesaje' },
  { valor: 'dias_30', texto: 'Últimos 30 días' },
  { valor: 'dias_60', texto: 'Últimos 60 días' },
  { valor: 'dias_90', texto: 'Últimos 90 días' },
  { valor: 'acumulado', texto: 'Acumulado desde la entrada' },
]

export default async function ComoVamos({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>
}) {
  const hoy = hoyBogota()
  const { periodo = 'ultimo_pesaje' } = await searchParams
  const { filas, resumen } = await desempeno(periodo, hoy)
  const objetivo = Number((await leerParametro('gdp_objetivo', hoy)) ?? 0)

  const ordenadas = [...filas].sort((a, b) => {
    if (a.gdpPeriodo === null) return 1
    if (b.gdpPeriodo === null) return -1
    return a.gdpPeriodo - b.gdpPeriodo
  })

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Cómo vamos</h1>

      <nav className="mb-6 flex flex-wrap gap-2">
        {PERIODOS.map((opcion) => (
          <a
            key={opcion.valor}
            href={`/como-vamos?periodo=${opcion.valor}`}
            className={`rounded px-3 py-1 text-sm ${
              opcion.valor === periodo ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {opcion.texto}
          </a>
        ))}
      </nav>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Cifra
          etiqueta="Ganancia diaria promedio"
          valor={formatearGdp(resumen.promedio)}
          comparacion={`basado en ${resumen.n} de ${resumen.total} animales`}
        />
        <Cifra etiqueta="Objetivo" valor={formatearGdp(objetivo)} />
        <Cifra
          etiqueta="Contra el objetivo"
          valor={
            resumen.promedio === null ? SIN_DATO : formatearGdp(resumen.promedio - objetivo)
          }
        />
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Chapeta</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Peso</th>
            <th className="p-2">Último pesaje</th>
            <th className="p-2">Kg ganados</th>
            <th className="p-2">Ganancia del periodo</th>
            <th className="p-2">Acumulada</th>
            <th className="p-2">Días</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((fila) => (
            <tr key={fila.animalId} className="border-b border-tierra/10">
              <td className="p-2">
                <a href={`/animales/${fila.animalId}`} className="font-medium text-pasto underline">
                  {fila.chapeta}
                </a>
              </td>
              <td className="p-2">{fila.lote}</td>
              <td className="cifra p-2">{formatearKg(fila.pesoActualKg)}</td>
              <td className="cifra p-2">{fila.fechaUltimoPesaje ?? SIN_DATO}</td>
              <td className="cifra p-2">{formatearKg(fila.kgGanados)}</td>
              <td className="cifra p-2">{formatearGdp(fila.gdpPeriodo)}</td>
              <td className="cifra p-2">{formatearGdp(fila.gdpAcumulada)}</td>
              <td className="cifra p-2">{fila.diasEnFinca}</td>
              <td className="p-2">
                <Semaforo clasificacion={fila.clasificacion} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pantalla Cómo vamos con ganancia promedio e individual por periodo"
```

---

## Task 19: Movimientos entre potreros con alerta de capacidad

**Files:**
- Create: `src/datos/movimientos.ts`
- Create: `src/app/potreros/acciones.ts`
- Modify: `src/app/potreros/page.tsx`
- Test: `src/datos/movimientos.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `pesoVivoPorLote`, `evaluarCapacidad`
- Produces: `type AvisoMovimiento = { permitido: boolean; mensaje: string; estadoResultante: EstadoCapacidad }`; `revisarMovimiento(loteId: string, potreroDestinoId: string): Promise<AvisoMovimiento>`; `moverLote(datos: { loteId: string; potreroDestinoId: string; fecha: FechaISO; registradoPorId: string }): Promise<void>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/movimientos.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { moverLote, revisarMovimiento } from './movimientos'

let loteId: string
let potreroChicoId: string
let potreroGrandeId: string

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.potrero.deleteMany()

  const chico = await prisma.potrero.create({
    data: { nombre: 'Potrero 1', hectareas: 2, capacidadKg: 1000 },
  })
  const grande = await prisma.potrero.create({
    data: { nombre: 'Potrero 2', hectareas: 10, capacidadKg: 20000 },
  })
  potreroChicoId = chico.id
  potreroGrandeId = grande.id

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001', '002', '003'],
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: null,
    pesos: { '001': 150, '002': 150, '003': 150 },
  })
})

describe('revisarMovimiento', () => {
  it('avisa que el potrero queda sobrecargado, pero permite el movimiento', async () => {
    const aviso = await revisarMovimiento(loteId, potreroChicoId)
    expect(aviso.estadoResultante).toBe('sobrecargado')
    expect(aviso.permitido).toBe(true)
    expect(aviso.mensaje).toContain('sobrecargado')
  })

  it('no avisa nada cuando el potrero aguanta el lote', async () => {
    const aviso = await revisarMovimiento(loteId, potreroGrandeId)
    expect(aviso.estadoResultante).toBe('holgado')
    expect(aviso.mensaje).toBe('')
  })
})

describe('moverLote', () => {
  it('registra el movimiento y actualiza el potrero actual del lote', async () => {
    await moverLote({
      loteId,
      potreroDestinoId: potreroGrandeId,
      fecha: '2026-09-05',
      registradoPorId: 'u1',
    })

    const lote = await prisma.lote.findUniqueOrThrow({ where: { id: loteId } })
    expect(lote.potreroActualId).toBe(potreroGrandeId)
    expect(lote.fechaEntradaPotrero?.toISOString().slice(0, 10)).toBe('2026-09-05')
    expect(await prisma.movimiento.count()).toBe(1)
  })

  it('guarda el potrero de origen en el segundo movimiento', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-05', registradoPorId: 'u1' })
    await moverLote({ loteId, potreroDestinoId: potreroChicoId, fecha: '2026-10-05', registradoPorId: 'u1' })

    const ultimo = await prisma.movimiento.findFirstOrThrow({ orderBy: { fecha: 'desc' } })
    expect(ultimo.potreroOrigenId).toBe(potreroGrandeId)
  })

  it('rechaza mover el lote al potrero donde ya está', async () => {
    await moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-05', registradoPorId: 'u1' })
    await expect(
      moverLote({ loteId, potreroDestinoId: potreroGrandeId, fecha: '2026-09-10', registradoPorId: 'u1' }),
    ).rejects.toThrow('ya está')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/movimientos.test.ts`
Expected: FAIL — `Failed to resolve import "./movimientos"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/movimientos.ts`:

```ts
import { evaluarCapacidad, type EstadoCapacidad } from '@/calc/potrero'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb } from './conversion'
import { pesoVivoPorLote } from './pesajes'

export type AvisoMovimiento = {
  permitido: boolean
  mensaje: string
  estadoResultante: EstadoCapacidad
}

/**
 * El techo del pasto se avisa en el momento del movimiento, no en un informe posterior.
 * Pero no se bloquea: a veces no hay otro potrero disponible y la decisión es del ganadero.
 */
export async function revisarMovimiento(
  loteId: string,
  potreroDestinoId: string,
): Promise<AvisoMovimiento> {
  const potrero = await prisma.potrero.findUniqueOrThrow({ where: { id: potreroDestinoId } })
  const pesos = await pesoVivoPorLote()
  const pesoLote = pesos.get(loteId) ?? 0

  const estadoResultante = evaluarCapacidad(pesoLote, potrero.capacidadKg)

  if (estadoResultante === 'sobrecargado') {
    return {
      permitido: true,
      estadoResultante,
      mensaje: `${potrero.nombre} quedaría sobrecargado: ${Math.round(pesoLote)} kg vivos contra una capacidad de ${potrero.capacidadKg} kg.`,
    }
  }
  if (estadoResultante === 'ajustado') {
    return {
      permitido: true,
      estadoResultante,
      mensaje: `${potrero.nombre} quedaría ajustado, por encima del 90 % de su capacidad.`,
    }
  }
  return { permitido: true, estadoResultante, mensaje: '' }
}

export async function moverLote(datos: {
  loteId: string
  potreroDestinoId: string
  fecha: FechaISO
  registradoPorId: string
}): Promise<void> {
  const lote = await prisma.lote.findUniqueOrThrow({ where: { id: datos.loteId } })

  if (lote.potreroActualId === datos.potreroDestinoId) {
    throw new Error('El lote ya está en ese potrero.')
  }

  await prisma.$transaction([
    prisma.movimiento.create({
      data: {
        loteId: datos.loteId,
        potreroOrigenId: lote.potreroActualId,
        potreroDestinoId: datos.potreroDestinoId,
        fecha: aFechaDb(datos.fecha),
        registradoPorId: datos.registradoPorId,
      },
    }),
    prisma.lote.update({
      where: { id: datos.loteId },
      data: {
        potreroActualId: datos.potreroDestinoId,
        fechaEntradaPotrero: aFechaDb(datos.fecha),
      },
    }),
  ])
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/movimientos.test.ts`
Expected: PASS — 5 pruebas

- [ ] **Step 5: Conectar la acción a la pantalla de potreros**

Crear `src/app/potreros/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { moverLote, revisarMovimiento } from '@/datos/movimientos'

export async function revisarMovimientoAccion(loteId: string, potreroDestinoId: string) {
  return revisarMovimiento(loteId, potreroDestinoId)
}

export async function moverLoteAccion(datos: FormData) {
  const usuario = await usuarioActual()
  await moverLote({
    loteId: String(datos.get('loteId')),
    potreroDestinoId: String(datos.get('potreroDestinoId')),
    fecha: String(datos.get('fecha')),
    registradoPorId: usuario.id,
  })
  revalidatePath('/potreros')
}
```

Añadir al final de `src/app/potreros/page.tsx`, dentro del `<main>`, después de la tabla:

```tsx
      <section className="mt-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Mover un lote</h2>
        <form action={moverLoteAccion} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Lote
            <select name="loteId" required className="ml-2 rounded border border-tierra/30 p-2">
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            A potrero
            <select name="potreroDestinoId" required className="ml-2 rounded border border-tierra/30 p-2">
              {potreros.map((potrero) => (
                <option key={potrero.id} value={potrero.id}>
                  {potrero.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input name="fecha" type="date" defaultValue={hoy} required className="ml-2 rounded border border-tierra/30 p-2" />
          </label>
          <button className="rounded bg-pasto px-4 py-2 text-white">Mover</button>
        </form>
      </section>
```

Añadir al inicio del archivo los imports `import { listarLotes } from '@/datos/lotes'` y `import { moverLoteAccion } from './acciones'`, y dentro del componente `const lotes = await listarLotes()` y `const hoy = hoyBogota()`, reutilizando `hoy` en la llamada a `listarPotreros`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: movimientos entre potreros con aviso de sobrecarga en el momento del registro"
```

---

## Task 20: Ficha del animal y eventos sanitarios

**Files:**
- Create: `src/datos/sanidad.ts`
- Create: `src/app/animales/[id]/page.tsx`
- Create: `src/ui/CurvaPeso.tsx`
- Test: `src/datos/sanidad.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaDb`, `aFechaISO`, `historialDeAnimal`, `hoyBogota`
- Produces: `registrarEvento(datos: DatosEvento): Promise<void>`; `eventosDeAnimal(animalId: string): Promise<EventoVista[]>`; `eventosVencidos(hoy: FechaISO): Promise<EventoVista[]>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/sanidad.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { eventosDeAnimal, eventosVencidos, registrarEvento } from './sanidad'

let loteId: string
let animalId: string

beforeEach(async () => {
  await prisma.eventoSanitario.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
  await crearAnimales({
    loteId,
    chapetas: ['001'],
    sexo: 'macho',
    raza: null,
    cruce: null,
    proveedor: null,
    fechaEntrada: '2026-09-01',
    edadEntradaMeses: null,
    pesos: { '001': 150 },
  })
  animalId = (await listarAnimalesDeLote(loteId))[0].id
})

describe('registrarEvento', () => {
  it('registra una desparasitación de un animal', async () => {
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-05',
      producto: 'Ivermectina',
      dosis: '1 ml / 50 kg',
      responsable: 'Joseph',
      proximaFecha: '2026-12-05',
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    const eventos = await eventosDeAnimal(animalId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0].producto).toBe('Ivermectina')
    expect(eventos[0].proximaFecha).toBe('2026-12-05')
  })

  it('registra una vacunación de lote completo', async () => {
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-05',
      producto: 'Aftosa',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: '2027-03-05',
      notas: null,
      animalId: null,
      loteId,
      registradoPorId: 'u1',
    })

    expect(await prisma.eventoSanitario.count({ where: { loteId } })).toBe(1)
  })

  it('rechaza un evento que no apunta ni a un animal ni a un lote', async () => {
    await expect(
      registrarEvento({
        tipo: 'vacuna',
        fecha: '2026-09-05',
        producto: 'Aftosa',
        dosis: null,
        responsable: 'Joseph',
        proximaFecha: null,
        notas: null,
        animalId: null,
        loteId: null,
        registradoPorId: 'u1',
      }),
    ).rejects.toThrow('animal o a un lote')
  })
})

describe('eventosVencidos', () => {
  it('devuelve los eventos cuya próxima fecha ya pasó', async () => {
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-05',
      producto: 'Ivermectina',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: '2026-12-05',
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    expect(await eventosVencidos('2026-12-01')).toHaveLength(0)
    expect(await eventosVencidos('2026-12-06')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/sanidad.test.ts`
Expected: FAIL — `Failed to resolve import "./sanidad"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/sanidad.ts`:

```ts
import type { TipoEventoSanitario } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

export type DatosEvento = {
  tipo: TipoEventoSanitario
  fecha: FechaISO
  producto: string
  dosis: string | null
  responsable: string
  proximaFecha: FechaISO | null
  notas: string | null
  animalId: string | null
  loteId: string | null
  registradoPorId: string
}

export type EventoVista = {
  id: string
  tipo: TipoEventoSanitario
  fecha: FechaISO
  producto: string
  dosis: string | null
  responsable: string
  proximaFecha: FechaISO | null
  chapeta: string | null
  lote: string | null
}

export async function registrarEvento(datos: DatosEvento): Promise<void> {
  if (!datos.animalId && !datos.loteId) {
    throw new Error('El evento sanitario debe apuntar a un animal o a un lote.')
  }

  await prisma.eventoSanitario.create({
    data: {
      tipo: datos.tipo,
      fecha: aFechaDb(datos.fecha),
      producto: datos.producto,
      dosis: datos.dosis,
      responsable: datos.responsable,
      proximaFecha: datos.proximaFecha ? aFechaDb(datos.proximaFecha) : null,
      notas: datos.notas,
      animalId: datos.animalId,
      loteId: datos.loteId,
      registradoPorId: datos.registradoPorId,
    },
  })
}

function aVista(evento: {
  id: string
  tipo: TipoEventoSanitario
  fecha: Date
  producto: string
  dosis: string | null
  responsable: string
  proximaFecha: Date | null
  animal: { chapeta: string } | null
  lote: { nombre: string } | null
}): EventoVista {
  return {
    id: evento.id,
    tipo: evento.tipo,
    fecha: aFechaISO(evento.fecha),
    producto: evento.producto,
    dosis: evento.dosis,
    responsable: evento.responsable,
    proximaFecha: evento.proximaFecha ? aFechaISO(evento.proximaFecha) : null,
    chapeta: evento.animal?.chapeta ?? null,
    lote: evento.lote?.nombre ?? null,
  }
}

/** Incluye los eventos del animal y los de su lote: una vacunación de lote también le aplicó. */
export async function eventosDeAnimal(animalId: string): Promise<EventoVista[]> {
  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id: animalId },
    select: { loteId: true },
  })

  const eventos = await prisma.eventoSanitario.findMany({
    where: { OR: [{ animalId }, { loteId: animal.loteId }] },
    include: { animal: { select: { chapeta: true } }, lote: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  })

  return eventos.map(aVista)
}

export async function eventosVencidos(hoy: FechaISO): Promise<EventoVista[]> {
  const eventos = await prisma.eventoSanitario.findMany({
    where: { proximaFecha: { lt: aFechaDb(hoy) } },
    include: { animal: { select: { chapeta: true } }, lote: { select: { nombre: true } } },
    orderBy: { proximaFecha: 'asc' },
  })
  return eventos.map(aVista)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/sanidad.test.ts`
Expected: PASS — 4 pruebas

- [ ] **Step 5: Escribir la curva de peso**

Crear `src/ui/CurvaPeso.tsx`. Es un SVG sin librerías: la serie real va en línea continua verde, la recta del objetivo en línea punteada ámbar, y las dos se distinguen por trazo además de por color.

```tsx
import type { Medicion } from '@/calc/gdp'
import { diasEntre } from '@/calc/fechas'

export function CurvaPeso({
  entrada,
  historial,
  gdpObjetivo,
}: {
  entrada: Medicion
  historial: Medicion[]
  gdpObjetivo: number
}) {
  const serie = [entrada, ...historial]
  if (serie.length < 2) {
    return <p className="text-sm text-carbon/60">Aún no hay suficientes pesajes para dibujar la curva.</p>
  }

  const ancho = 640
  const alto = 240
  const margen = 32

  const diasTotales = diasEntre(entrada.fecha, serie.at(-1)!.fecha)
  const pesoObjetivoFinal = entrada.pesoKg + (gdpObjetivo * diasTotales) / 1000
  const pesoMax = Math.max(...serie.map((m) => m.pesoKg), pesoObjetivoFinal)
  const pesoMin = Math.min(...serie.map((m) => m.pesoKg), entrada.pesoKg)

  const x = (fecha: string) =>
    margen + (diasEntre(entrada.fecha, fecha) / Math.max(1, diasTotales)) * (ancho - 2 * margen)
  const y = (peso: number) =>
    alto - margen - ((peso - pesoMin) / Math.max(1, pesoMax - pesoMin)) * (alto - 2 * margen)

  const real = serie.map((m) => `${x(m.fecha)},${y(m.pesoKg)}`).join(' ')
  const objetivo = `${x(entrada.fecha)},${y(entrada.pesoKg)} ${x(serie.at(-1)!.fecha)},${y(pesoObjetivoFinal)}`

  return (
    <figure>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label="Curva de peso">
        <polyline points={objetivo} fill="none" stroke="#D98324" strokeWidth="2" strokeDasharray="6 4" />
        <polyline points={real} fill="none" stroke="#1B5E3F" strokeWidth="2.5" />
        {serie.map((m) => (
          <circle key={m.fecha} cx={x(m.fecha)} cy={y(m.pesoKg)} r="3.5" fill="#1B5E3F" />
        ))}
      </svg>
      <figcaption className="text-xs text-carbon/60">
        Línea continua: peso medido. Línea punteada: el objetivo de {gdpObjetivo} g/día.
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 6: Escribir la ficha del animal**

Crear `src/app/animales/[id]/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { gdpAcumulada } from '@/calc/gdp'
import { prisma } from '@/datos/cliente'
import { aFechaISO, aKg } from '@/datos/conversion'
import { leerParametro } from '@/datos/parametros'
import { historialDeAnimal } from '@/datos/pesajes'
import { eventosDeAnimal } from '@/datos/sanidad'
import { Cifra } from '@/ui/Cifra'
import { CurvaPeso } from '@/ui/CurvaPeso'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

export default async function FichaAnimal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hoy = hoyBogota()

  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id },
    include: { lote: { select: { nombre: true } } },
  })
  const entrada = { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) }
  const historial = await historialDeAnimal(id)
  const eventos = await eventosDeAnimal(id)
  const ultimo = historial.at(-1) ?? null
  const gdpObjetivo = Number((await leerParametro('gdp_objetivo', hoy)) ?? 0)

  return (
    <main className="p-6">
      <h1 className="font-serif text-3xl text-pasto">Chapeta {animal.chapeta}</h1>
      <p className="mb-6 text-sm text-carbon/70">
        {animal.lote.nombre} · {animal.raza ?? 'raza sin registrar'} · entró el {entrada.fecha} con{' '}
        {formatearKg(entrada.pesoKg)}
        {animal.proveedor ? ` · ${animal.proveedor}` : ''}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Cifra etiqueta="Peso actual" valor={formatearKg(ultimo?.pesoKg ?? null)} comparacion={ultimo ? `medido el ${ultimo.fecha}` : undefined} />
        <Cifra etiqueta="Kilos ganados" valor={ultimo ? formatearKg(ultimo.pesoKg - entrada.pesoKg) : SIN_DATO} />
        <Cifra etiqueta="Ganancia acumulada" valor={formatearGdp(ultimo ? gdpAcumulada(entrada, ultimo) : null)} />
      </div>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Peso en el tiempo</h2>
        <CurvaPeso entrada={entrada} historial={historial} gdpObjetivo={gdpObjetivo} />
      </section>

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Sanidad</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-carbon/60">Sin eventos registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {eventos.map((evento) => (
              <li key={evento.id} className="border-b border-tierra/10 pb-2">
                <span className="cifra">{evento.fecha}</span> · {evento.tipo} · {evento.producto}
                {evento.dosis ? ` (${evento.dosis})` : ''} · {evento.responsable}
                {evento.proximaFecha && (
                  <span className="ml-2 text-ambar">próxima: {evento.proximaFecha}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: ficha del animal con curva de peso y historial sanitario"
```

---

## Task 21: Pantalla Hoy, navegación y frescura de los datos

**Files:**
- Create: `src/datos/frescura.ts`
- Create: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/datos/frescura.test.ts`

**Interfaces:**
- Consumes: `prisma`, `aFechaISO`, `diasEntre`, `desempeno`, `kgProducidos`, `eventosVencidos`
- Produces: `type Frescura = { ultimaFecha: FechaISO | null; diasSinDatos: number | null; alarmante: boolean }`; `frescura(hoy: FechaISO): Promise<Frescura>`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/datos/frescura.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { frescura } from './frescura'
import { crearLote } from './lotes'
import { guardarPesaje } from './pesajes'

beforeEach(async () => {
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
})

describe('frescura', () => {
  it('reporta que no hay datos cuando la finca está vacía', async () => {
    const estado = await frescura('2026-10-01')
    expect(estado.ultimaFecha).toBeNull()
    expect(estado.diasSinDatos).toBeNull()
    expect(estado.alarmante).toBe(true)
  })

  it('cuenta los días desde el último pesaje', async () => {
    const loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id
    await guardarPesaje({
      fecha: '2026-10-01',
      metodo: 'cinta',
      responsable: 'Joseph',
      notas: null,
      registradoPorId: 'u1',
      mediciones: [{ animalId, pesoKg: 174 }],
    })

    const reciente = await frescura('2026-10-10')
    expect(reciente.diasSinDatos).toBe(9)
    expect(reciente.alarmante).toBe(false)

    const viejo = await frescura('2026-11-20')
    expect(viejo.diasSinDatos).toBe(50)
    expect(viejo.alarmante).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npm test src/datos/frescura.test.ts`
Expected: FAIL — `Failed to resolve import "./frescura"`

- [ ] **Step 3: Escribir la implementación**

Crear `src/datos/frescura.ts`:

```ts
import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO } from './conversion'

/** A partir de este punto los indicadores dejan de describir la finca de hoy. */
const DIAS_PARA_ALARMA = 30

export type Frescura = {
  ultimaFecha: FechaISO | null
  diasSinDatos: number | null
  alarmante: boolean
}

export async function frescura(hoy: FechaISO): Promise<Frescura> {
  const ultimo = await prisma.pesaje.findFirst({
    where: { anuladoEn: null },
    orderBy: { fecha: 'desc' },
    select: { fecha: true },
  })

  if (!ultimo) return { ultimaFecha: null, diasSinDatos: null, alarmante: true }

  const ultimaFecha = aFechaISO(ultimo.fecha)
  const diasSinDatos = diasEntre(ultimaFecha, hoy)
  return { ultimaFecha, diasSinDatos, alarmante: diasSinDatos > DIAS_PARA_ALARMA }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npm test src/datos/frescura.test.ts`
Expected: PASS — 2 pruebas

- [ ] **Step 5: Escribir la navegación**

Reemplazar el cuerpo de `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const titulos = Fraunces({ subsets: ['latin'], variable: '--font-titulos' })
const interfaz = Inter({ subsets: ['latin'], variable: '--font-interfaz' })

export const metadata: Metadata = {
  title: 'SOFÍA',
  description: 'Control integral de la finca Santa Verónica',
}

const ENLACES = [
  { href: '/', texto: 'Hoy' },
  { href: '/como-vamos', texto: 'Cómo vamos' },
  { href: '/digitar', texto: 'Digitar' },
  { href: '/lotes', texto: 'Lotes' },
  { href: '/potreros', texto: 'Potreros' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${titulos.variable} ${interfaz.variable}`}>
      <body>
        <header className="border-b border-tierra/20 bg-pasto text-white">
          <nav className="flex flex-wrap items-center gap-4 p-4">
            <span className="font-serif text-xl">SOFÍA</span>
            {ENLACES.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="text-sm hover:underline">
                {enlace.texto}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Escribir la pantalla Hoy**

Crear `src/app/page.tsx`:

```tsx
import { hoyBogota } from '@/calc/fechas'
import { kgProducidos, type AnimalProduccion } from '@/calc/produccion'
import { prisma } from '@/datos/cliente'
import { aKg } from '@/datos/conversion'
import { desempeno } from '@/datos/desempeno'
import { frescura } from '@/datos/frescura'
import { pesoVivoPorLote, ultimoPesoPorAnimal } from '@/datos/pesajes'
import { eventosVencidos } from '@/datos/sanidad'
import { Cifra } from '@/ui/Cifra'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

export default async function Hoy() {
  const hoy = hoyBogota()
  const estado = await frescura(hoy)
  const { filas, resumen } = await desempeno('ultimo_pesaje', hoy)
  const pesos = await pesoVivoPorLote()
  const ultimos = await ultimoPesoPorAnimal()
  const vencidos = await eventosVencidos(hoy)

  const animales = await prisma.animal.findMany({
    where: { lote: { tipo: 'ceba' } },
    select: { id: true, estado: true, pesoEntradaKg: true },
  })
  const paraProduccion: AnimalProduccion[] = animales.map((animal) => ({
    estado: animal.estado,
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    pesoUltimoKg: ultimos.get(animal.id)?.pesoKg ?? null,
  }))

  const pesoVivoTotal = [...pesos.values()].reduce((a, b) => a + b, 0)
  const bajoRendimiento = filas.filter(
    (f) => f.clasificacion === 'bajo' || f.clasificacion === 'critico',
  )

  return (
    <main className="p-6">
      <p
        className={
          estado.alarmante
            ? 'mb-6 text-2xl font-semibold text-ambar'
            : 'mb-6 text-sm text-carbon/60'
        }
      >
        {estado.diasSinDatos === null
          ? 'Todavía no hay ningún pesaje registrado.'
          : `Últimos datos hace ${estado.diasSinDatos} días (${estado.ultimaFecha}).`}
      </p>

      <h2 className="mb-3 font-serif text-2xl text-pasto">Engorde</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Cifra etiqueta="Animales vivos" valor={String(filas.length)} />
        <Cifra etiqueta="Peso vivo total" valor={formatearKg(pesoVivoTotal)} />
        <Cifra
          etiqueta="Ganancia diaria promedio"
          valor={formatearGdp(resumen.promedio)}
          comparacion={`basado en ${resumen.n} de ${resumen.total} animales`}
        />
        <Cifra etiqueta="Kilos producidos" valor={formatearKg(kgProducidos(paraProduccion))} />
      </div>

      <h2 className="mb-3 font-serif text-2xl text-pasto">Atender</h2>
      <ul className="mb-8 space-y-2 text-sm">
        {bajoRendimiento.length > 0 && (
          <li>
            <a href="/como-vamos" className="text-rojo-tierra underline">
              {bajoRendimiento.length} animal(es) por debajo del umbral de rendimiento
            </a>
          </li>
        )}
        {vencidos.length > 0 && (
          <li className="text-ambar">{vencidos.length} evento(s) sanitario(s) con fecha cumplida</li>
        )}
        {bajoRendimiento.length === 0 && vencidos.length === 0 && (
          <li className="text-carbon/60">Nada pendiente.</li>
        )}
      </ul>

      <p className="border-t border-tierra/20 pt-4 text-xs text-carbon/50">
        SOFÍA — por Sofanor Echeverría.
      </p>
    </main>
  )
}
```

Las cifras de plata (gastos del mes, costo por kilogramo, cobertura de metas) llegan en el plan 2. Hasta entonces la pantalla Hoy muestra solo el bloque de engorde, sin espacios reservados vacíos.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pantalla Hoy con frescura de los datos, engorde y pendientes"
```

---

## Task 22: Prueba de extremo a extremo de la digitación

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/digitar.spec.ts`
- Create: `e2e/preparar.ts`

**Interfaces:**
- Consumes: la aplicación completa
- Produces: nada — es la red de seguridad de la pantalla donde un error se multiplica por 56

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Crear `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Escribir la prueba que falla**

Crear `e2e/digitar.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('digitar una tanda muestra la ganancia antes de guardar y atrapa el dedazo', async ({ page }) => {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', '2026-10-01')

  const campos = page.locator('input[name^="peso_"]')
  await campos.nth(0).fill('174')
  await campos.nth(1).fill('900')

  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText('800 g/día')).toBeVisible()
  await expect(page.getByText(/Revisa que el peso esté bien digitado/)).toBeVisible()
})

test('un pesaje anterior al ingreso del animal no se guarda', async ({ page }) => {
  await page.goto('/entrar')
  await page.fill('input[name="correo"]', 'joseph@ejemplo.com')
  await page.fill('input[name="clave"]', 'claveDePrueba')
  await page.click('button')

  await page.goto('/digitar')
  await page.fill('input[name="fecha"]', '2026-08-01')
  await page.locator('input[name^="peso_"]').first().fill('160')
  await page.getByRole('button', { name: 'Revisar antes de guardar' }).click()

  await expect(page.getByText(/anterior al ingreso/)).toBeVisible()
  await expect(
    page.getByText('Corrige las filas en rojo antes de guardar'),
  ).toBeVisible()
})
```

- [ ] **Step 3: Preparar los datos de la prueba**

Crear `e2e/preparar.ts`, que deja la base en un estado conocido antes de correr Playwright:

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.usuario.deleteMany()

  await prisma.usuario.create({
    data: {
      nombre: 'Joseph',
      correo: 'joseph@ejemplo.com',
      claveHash: await bcrypt.hash('claveDePrueba', 12),
    },
  })

  const lote = await prisma.lote.create({
    data: { nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: new Date('2026-09-01T00:00:00.000Z') },
  })

  for (const chapeta of ['001', '002']) {
    await prisma.animal.create({
      data: {
        chapeta,
        loteId: lote.id,
        sexo: 'macho',
        raza: 'Brahman',
        fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
        pesoEntradaKg: 150,
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run:

```bash
DATABASE_URL="postgresql://jdh@localhost:5432/sofia_test" npx tsx e2e/preparar.ts
DATABASE_URL="postgresql://jdh@localhost:5432/sofia_test" npx playwright test
```

`e2e/preparar.ts` borra usuarios, lotes y animales. Corrido contra `sofia` se
llevaría por delante los datos reales de la finca.

Expected: PASS — 2 pruebas

- [ ] **Step 5: Ejecutar la suite completa**

Run: `npm test && npx playwright test`
Expected: PASS — todas las pruebas unitarias y las dos de extremo a extremo

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: prueba de extremo a extremo de la pantalla de digitación"
```

---

## Qué queda fuera de este plan

Estos puntos del diseño se implementan en los planes 2 y 3, y aquí se listan para que nadie los dé por olvidados:

| Del diseño | Plan |
|---|---|
| Gastos, categorías, fijos y variables | 2 |
| Compras y ventas de ganado | 2 |
| Costo real de entrada por animal | 2 |
| Costo directo y total por kilogramo producido | 2 |
| Cobertura de las dos metas | 2 |
| Exposición de caja | 2 |
| Punto de equilibrio en sus cuatro formas | 2 |
| Recordatorios de gastos recurrentes | 2 |
| Bloque de plata en la pantalla Hoy | 2 |
| Comparador por característica | 3 |
| Simulador financiero | 3 |
| Proyecciones de peso y fecha de venta en pantalla | 3 |
| Pantalla de Configuración con edición de parámetros | 3 |

Nota sobre la Configuración: el plan 1 crea los parámetros por semilla y los lee correctamente, pero la pantalla para editarlos desde el navegador es del plan 3. Mientras tanto se cambian por consola con `guardarParametro`. Esto es deuda consciente, no un olvido: en el plan 1 los umbrales no cambian a diario.
