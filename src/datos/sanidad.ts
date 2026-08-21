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
