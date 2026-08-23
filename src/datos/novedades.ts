import { Prisma, type TipoNovedad } from '@prisma/client'
import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

export type DatosHecho = {
  fecha: FechaISO
  descripcion: string
  /** Opcional: a qué lote se refiere. Puede ir con `potreroId`, con ninguno o con los dos. */
  loteId: string | null
  /** Opcional: a qué potrero se refiere. */
  potreroId: string | null
  registradoPorId: string
}

export type DatosSuministro = {
  fechaInicio: FechaISO
  descripcion: string
  /**
   * Obligatorio: un suministro es del ganado, no del potrero -- no existe
   * "suministro sin lote" como sí existe "hecho sin lote".
   */
  loteId: string
  registradoPorId: string
}

export type NovedadVista = {
  id: string
  tipo: TipoNovedad
  descripcion: string
  /** Fecha del hecho, o fecha de inicio del suministro. */
  fecha: FechaISO
  /** Solo aplica a un suministro. Nulo mientras siga vigente. */
  fechaFin: FechaISO | null
  loteId: string | null
  loteNombre: string | null
  potreroId: string | null
  potreroNombre: string | null
  registradoPorId: string
  anuladoEn: FechaISO | null
  motivoAnulacion: string | null
}

function validarFechaNoFutura(fecha: FechaISO, hoy: FechaISO, etiqueta: string): void {
  if (diasEntre(hoy, fecha) > 0) {
    throw new Error(`La fecha ${etiqueta} no puede ser posterior a hoy (${hoy}).`)
  }
}

/**
 * Un hecho puntual: pasó un día y ya ("se arregló el bebedero del Jobo").
 * Texto libre a propósito -- sin categorías ni producto y cantidad
 * separados, la misma decisión que el dueño tomó para todo este registro.
 */
export async function registrarHecho(datos: DatosHecho, hoy: FechaISO): Promise<string> {
  const descripcionLimpia = datos.descripcion.trim()
  if (descripcionLimpia === '') {
    throw new Error('La novedad necesita una descripción: qué pasó.')
  }
  validarFechaNoFutura(datos.fecha, hoy, 'de la novedad')

  const novedad = await prisma.novedad.create({
    data: {
      tipo: 'hecho',
      descripcion: descripcionLimpia,
      fecha: aFechaDb(datos.fecha),
      loteId: datos.loteId,
      potreroId: datos.potreroId,
      registradoPorId: datos.registradoPorId,
    },
  })
  return novedad.id
}

/**
 * Un suministro en curso: un régimen que dura ("sal a voluntad desde el 5
 * de agosto"). Nace siempre vigente -- sin fecha de fin -- porque nadie
 * sabe de antemano cuándo se va a dejar de dar; `cerrarSuministro` es la
 * única forma de ponérsela, cuando de verdad se deja de dar.
 */
export async function registrarSuministro(datos: DatosSuministro, hoy: FechaISO): Promise<string> {
  const descripcionLimpia = datos.descripcion.trim()
  if (descripcionLimpia === '') {
    throw new Error('El suministro necesita una descripción: qué se está dando.')
  }
  if (!datos.loteId || datos.loteId.trim() === '') {
    throw new Error('El suministro necesita un lote: a quién se le está dando.')
  }
  validarFechaNoFutura(datos.fechaInicio, hoy, 'de inicio')

  const novedad = await prisma.novedad.create({
    data: {
      tipo: 'suministro',
      descripcion: descripcionLimpia,
      fecha: aFechaDb(datos.fechaInicio),
      loteId: datos.loteId,
      registradoPorId: datos.registradoPorId,
    },
  })
  return novedad.id
}

/**
 * Cierra un suministro: le pone fecha de fin. Es un evento normal de su
 * ciclo de vida, no una corrección -- distinto de `anularNovedad`, que es
 * para cuando el registro estuvo mal desde el principio. Se lee primero
 * para poder dar un mensaje de error específico (no existe / no es un
 * suministro / ya está cerrado / está anulado); el `where` del `update` de
 * verdad lleva además `fechaFin: null, anuladoEn: null` para que dos
 * cierres concurrentes del mismo suministro no se pisen -- mismo patrón que
 * `anularPesaje` en `src/datos/pesajes.ts`.
 */
export async function cerrarSuministro(id: string, fechaFin: FechaISO, hoy: FechaISO): Promise<void> {
  validarFechaNoFutura(fechaFin, hoy, 'de cierre')

  const suministro = await prisma.novedad.findUnique({ where: { id } })
  if (!suministro) {
    throw new Error('Este suministro ya no existe.')
  }
  if (suministro.tipo !== 'suministro') {
    throw new Error('Solo un suministro se puede cerrar; esto es un hecho puntual.')
  }
  if (suministro.anuladoEn) {
    throw new Error('Este suministro está anulado; no se puede cerrar.')
  }
  if (suministro.fechaFin) {
    throw new Error('Este suministro ya está cerrado.')
  }
  if (diasEntre(aFechaISO(suministro.fecha), fechaFin) < 0) {
    throw new Error(
      `La fecha de cierre no puede ser anterior a cuándo empezó (${aFechaISO(suministro.fecha)}).`,
    )
  }

  try {
    await prisma.novedad.update({
      where: { id, fechaFin: null, anuladoEn: null },
      data: { fechaFin: aFechaDb(fechaFin) },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error('Este suministro ya se cerró o se anuló mientras tanto. Recarga la página.')
    }
    throw error
  }
}

/**
 * Anula una novedad -- hecho o suministro -- sin borrarla. Igual que
 * `anularPesaje`: exige un motivo, porque una anulación sin explicación deja
 * un hueco tan malo como el dato que se quiso corregir.
 */
export async function anularNovedad(id: string, motivo: string, usuarioId: string): Promise<void> {
  const motivoLimpio = motivo.trim()
  if (motivoLimpio === '') {
    throw new Error('La anulación necesita un motivo: explica por qué esta novedad ya no cuenta.')
  }

  try {
    await prisma.novedad.update({
      where: { id, anuladoEn: null },
      data: { anuladoEn: new Date(), motivoAnulacion: motivoLimpio, anuladoPorId: usuarioId },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      const novedad = await prisma.novedad.findUnique({ where: { id } })
      if (!novedad) {
        throw new Error('Esta novedad no existe.')
      }
      throw new Error('Esta novedad ya está anulada.')
    }
    throw error
  }
}

function aVista(novedad: {
  id: string
  tipo: TipoNovedad
  descripcion: string
  fecha: Date
  fechaFin: Date | null
  loteId: string | null
  lote: { nombre: string } | null
  potreroId: string | null
  potrero: { nombre: string } | null
  registradoPorId: string
  anuladoEn: Date | null
  motivoAnulacion: string | null
}): NovedadVista {
  return {
    id: novedad.id,
    tipo: novedad.tipo,
    descripcion: novedad.descripcion,
    fecha: aFechaISO(novedad.fecha),
    fechaFin: novedad.fechaFin ? aFechaISO(novedad.fechaFin) : null,
    loteId: novedad.loteId,
    loteNombre: novedad.lote?.nombre ?? null,
    potreroId: novedad.potreroId,
    potreroNombre: novedad.potrero?.nombre ?? null,
    registradoPorId: novedad.registradoPorId,
    anuladoEn: novedad.anuladoEn ? aFechaISO(novedad.anuladoEn) : null,
    motivoAnulacion: novedad.motivoAnulacion,
  }
}

/**
 * "¿Qué está recibiendo este lote ahora mismo?" -- los suministros vigentes:
 * sin fecha de fin y no anulados. Es la pregunta del encargo original que la
 * plataforma no sabía contestar.
 */
export async function listarSuministrosVigentes(loteId: string): Promise<NovedadVista[]> {
  const novedades = await prisma.novedad.findMany({
    where: { loteId, tipo: 'suministro', fechaFin: null, anuladoEn: null },
    include: { lote: { select: { nombre: true } }, potrero: { select: { nombre: true } } },
    orderBy: { fecha: 'asc' },
  })
  return novedades.map(aVista)
}

/**
 * "¿Qué ha pasado en la finca?" -- hechos y suministros mezclados, el más
 * reciente primero. Incluye los anulados, con su motivo: igual que los
 * pesajes, "se anuló" tiene que seguir viéndose, no ser indistinguible de
 * "nunca existió".
 */
export async function listarHistoria(
  filtro: { loteId?: string } = {},
  limite = 100,
): Promise<NovedadVista[]> {
  const novedades = await prisma.novedad.findMany({
    where: filtro.loteId ? { loteId: filtro.loteId } : {},
    include: { lote: { select: { nombre: true } }, potrero: { select: { nombre: true } } },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    take: limite,
  })
  return novedades.map(aVista)
}
