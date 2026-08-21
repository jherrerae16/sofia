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
