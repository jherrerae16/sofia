import { Prisma } from '@prisma/client'
import { diasEntre } from '@/calc/fechas'
import { type Mes, mesDe, totalesPorMes, type TotalMes } from '@/calc/gastos'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

export type DatosGasto = {
  fecha: FechaISO
  descripcion: string
  /** Entero en pesos. */
  valor: number
  registradoPorId: string
}

export type GastoVista = {
  id: string
  fecha: FechaISO
  descripcion: string
  valor: number
  anotadoPor: string
  anulado: boolean
  motivoAnulacion: string | null
}

/**
 * Un gasto de la finca entera. Texto libre a propósito, sin categorías y
 * sin lote: así lo decidió el dueño. Lo único que se exige es lo que hace
 * falta para que el total del mes sea cierto.
 */
export async function registrarGasto(datos: DatosGasto, hoy: FechaISO): Promise<string> {
  const descripcion = datos.descripcion.trim()
  if (descripcion === '') {
    throw new Error('Falta decir qué fue el gasto.')
  }
  if (!Number.isInteger(datos.valor) || datos.valor <= 0) {
    throw new Error('Falta el valor. Escríbelo en pesos, sin centavos.')
  }
  if (diasEntre(hoy, datos.fecha) > 0) {
    throw new Error(`La fecha del gasto no puede ser posterior a hoy (${hoy}).`)
  }

  const gasto = await prisma.gasto.create({
    data: {
      fecha: aFechaDb(datos.fecha),
      descripcion,
      valor: datos.valor,
      registradoPorId: datos.registradoPorId,
    },
  })
  return gasto.id
}

/** Anula sin borrar, con motivo obligatorio -- igual que `anularNovedad`. */
export async function anularGasto(id: string, motivo: string, usuarioId: string): Promise<void> {
  const motivoLimpio = motivo.trim()
  if (motivoLimpio === '') {
    throw new Error('La anulación necesita un motivo: explica por qué este gasto ya no cuenta.')
  }

  try {
    await prisma.gasto.update({
      where: { id, anuladoEn: null },
      data: { anuladoEn: new Date(), motivoAnulacion: motivoLimpio, anuladoPorId: usuarioId },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      const gasto = await prisma.gasto.findUnique({ where: { id } })
      throw new Error(gasto ? 'Este gasto ya está anulado.' : 'Este gasto no existe.')
    }
    throw error
  }
}

function primerDia(mes: Mes): FechaISO {
  return `${mes}-01`
}

function mesSiguiente(mes: Mes): Mes {
  const [anio, numero] = mes.split('-').map(Number)
  return numero === 12 ? `${anio + 1}-01` : `${anio}-${String(numero + 1).padStart(2, '0')}`
}

/** Los gastos de un mes, anulados incluidos, del más reciente al más viejo. */
export async function listarGastosDelMes(mes: Mes): Promise<GastoVista[]> {
  const [gastos, usuarios] = await Promise.all([
    prisma.gasto.findMany({
      where: { fecha: { gte: aFechaDb(primerDia(mes)), lt: aFechaDb(primerDia(mesSiguiente(mes))) } },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    }),
    prisma.usuario.findMany({ select: { id: true, nombre: true } }),
  ])
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]))
  return gastos.map((gasto) => ({
    id: gasto.id,
    fecha: aFechaISO(gasto.fecha),
    descripcion: gasto.descripcion,
    valor: gasto.valor,
    anotadoPor: nombres.get(gasto.registradoPorId) ?? '',
    anulado: gasto.anuladoEn !== null,
    motivoAnulacion: gasto.motivoAnulacion,
  }))
}

/** El total de cada mes con gastos, más el mes de hoy aunque esté vacío. */
export async function listarTotalesPorMes(hoy: FechaISO): Promise<TotalMes[]> {
  const gastos = await prisma.gasto.findMany({ select: { fecha: true, valor: true, anuladoEn: true } })
  return totalesPorMes(
    gastos.map((g) => ({ fecha: aFechaISO(g.fecha), valor: g.valor, anulado: g.anuladoEn !== null })),
    mesDe(hoy),
  )
}
