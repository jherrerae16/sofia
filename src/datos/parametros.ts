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
