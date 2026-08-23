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
  chapeta: string
  lote: string | null
}

export async function registrarEvento(datos: DatosEvento): Promise<void> {
  if (!datos.animalId && !datos.loteId) {
    throw new Error('El evento sanitario debe apuntar a un animal o a un lote.')
  }

  // A quiénes se les aplicó de verdad. Si viene un animal, es ese y ya. Si
  // viene un lote, son los animales ACTIVOS que ya habían entrado ese día:
  // uno que llega en octubre no recibió la vacuna de septiembre, y uno que ya
  // se vendió tampoco.
  const animalIds = datos.animalId
    ? [datos.animalId]
    : (
        await prisma.animal.findMany({
          where: {
            loteId: datos.loteId!,
            estado: 'activo',
            fechaEntrada: { lte: aFechaDb(datos.fecha) },
          },
          select: { id: true },
        })
      ).map((animal) => animal.id)

  if (animalIds.length === 0) {
    throw new Error(
      'Ningún animal de este lote había entrado a la finca en esa fecha, así que no hay a quién anotarle la aplicación.',
    )
  }

  const comun = {
    tipo: datos.tipo,
    fecha: aFechaDb(datos.fecha),
    producto: datos.producto,
    dosis: datos.dosis,
    responsable: datos.responsable,
    proximaFecha: datos.proximaFecha ? aFechaDb(datos.proximaFecha) : null,
    notas: datos.notas,
    // Rastro de que fue una aplicación en tanda; no es de donde cuelga el
    // evento. Un evento de un animal solo no lleva lote.
    loteId: datos.animalId ? null : datos.loteId,
    registradoPorId: datos.registradoPorId,
  }

  // Una fila por animal, en una sola transacción: media tanda anotada es peor
  // que ninguna, porque nadie sabría a cuáles les faltó.
  await prisma.eventoSanitario.createMany({
    data: animalIds.map((animalId) => ({ ...comun, animalId })),
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
  animal: { chapeta: string }
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
    chapeta: evento.animal.chapeta,
    lote: evento.lote?.nombre ?? null,
  }
}

/**
 * La historia sanitaria del animal, y solo la de él. No se resuelve por el
 * lote: una aplicación en tanda ya dejó una fila propia para cada animal que
 * la recibió (ver `registrarEvento`), así que un animal que entró después no
 * hereda nada y uno que cambia de lote no pierde nada.
 */
export async function eventosDeAnimal(animalId: string): Promise<EventoVista[]> {
  const eventos = await prisma.eventoSanitario.findMany({
    where: { animalId },
    include: { animal: { select: { chapeta: true } }, lote: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  })

  return eventos.map(aVista)
}

/**
 * Lo que está vencido HOY, mirando solo la última aplicación de cada tipo en
 * cada animal activo. Sin ese "solo la última", una desparasitación de mayo con
 * próxima fecha en agosto sigue gritando "vencida" para siempre aunque el 10
 * de agosto se haya vuelto a desparasitar, y los avisos se amontonan ciclo
 * tras ciclo hasta que la portada no sirve para nada.
 */
export async function eventosVencidos(hoy: FechaISO): Promise<EventoVista[]> {
  const eventos = await prisma.eventoSanitario.findMany({
    // Solo animales que siguen en la finca: desparasitar a uno que se vendió
    // en julio no es tarea de nadie, y el aviso entierra a los que sí importan.
    where: { animal: { estado: 'activo' } },
    include: { animal: { select: { chapeta: true } }, lote: { select: { nombre: true } } },
    // Más reciente primero: el primero que se ve de cada (animal, tipo) es la
    // aplicación que manda. `creadoEn` desempata dos aplicaciones del mismo
    // día -- la que se anotó después es la que corrige a la anterior.
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
  })

  const vigentes: typeof eventos = []
  const yaVisto = new Set<string>()
  for (const evento of eventos) {
    const calendario = `${evento.animalId}|${evento.tipo}`
    if (yaVisto.has(calendario)) continue
    yaVisto.add(calendario)
    vigentes.push(evento)
  }

  const limite = aFechaDb(hoy)
  return vigentes
    .filter((evento) => evento.proximaFecha !== null && evento.proximaFecha < limite)
    .sort((a, b) => a.proximaFecha!.getTime() - b.proximaFecha!.getTime())
    .map(aVista)
}
