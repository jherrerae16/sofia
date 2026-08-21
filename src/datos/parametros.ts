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

/**
 * Se lanza cuando falta un parámetro obligatorio. Es una subclase de `Error` (no
 * un `Error` a secas) para que quien la atrape — hoy, la portada — pueda
 * distinguirla con `instanceof` de cualquier otro fallo inesperado y no termine
 * ocultando un bug real detrás de un mensaje de "falta configurar".
 */
export class ParametroFaltanteError extends Error {
  constructor(
    public readonly clave: string,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ParametroFaltanteError'
  }
}

async function exigir(clave: string, en: FechaISO): Promise<number> {
  const valor = await leerParametro(clave, en)
  if (valor === null) {
    throw new ParametroFaltanteError(
      clave,
      `Falta el parámetro ${clave} vigente en ${en}. Configúralo antes de continuar.`,
    )
  }
  const numero = Number(valor)
  // Un umbral guardado como texto no numérico no puede colar como NaN: `gdp
  // >= NaN` es siempre falso, y eso clasificaría a todos los animales como
  // 'critico' sin que nadie se entere de que la causa es un dato mal
  // guardado. Se rechaza igual que un parámetro ausente.
  if (!Number.isFinite(numero)) {
    throw new ParametroFaltanteError(
      clave,
      `El parámetro ${clave} vigente en ${en} no es un número (quedó guardado "${valor}"). Corrígelo antes de continuar.`,
    )
  }
  return numero
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

/**
 * Objetivo de ganancia diaria configurado, o null si nadie lo ha configurado
 * o si quedó guardado un valor que no es un número finito.
 *
 * A diferencia de `leerUmbrales`, un objetivo ausente no impide seguir
 * mostrando el resto de la pantalla: por eso no lanza, sino que devuelve
 * null para que cada pantalla decida cómo mostrar "sin dato". Lo que no
 * puede hacer es inventar un cero: un objetivo de 0 g/día haría que la
 * finca "cumpliera" siempre, contra una meta que nadie fijó.
 */
export async function leerGdpObjetivo(en: FechaISO): Promise<number | null> {
  const valor = await leerParametro('gdp_objetivo', en)
  if (valor === null) return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}
