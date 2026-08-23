import type { TipoEventoSanitario } from '@prisma/client'
import type { FechaISO } from '@/calc/tipos'
import { ETIQUETA_ESTADO_ANIMAL } from '@/ui/etiquetas'
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
    where: { animalId, anuladoEn: null },
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
    where: { anuladoEn: null, animal: { estado: 'activo' } },
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

export type CandidatoAplicacion = {
  animalId: string
  chapeta: string
  aplicable: boolean
  /** Null si es aplicable. Si no, la razón en español, para mostrarla apagada. */
  razon: string | null
}

/**
 * A quiénes se les puede anotar algo en esa fecha.
 *
 * Los que no salen igual, apagados y con la razón escrita: si simplemente
 * faltaran de la lista, el dueño creería que se le perdió un animal.
 */
export async function candidatosDeAplicacion(
  loteId: string,
  fecha: FechaISO,
): Promise<CandidatoAplicacion[]> {
  const animales = await prisma.animal.findMany({
    where: { loteId },
    select: { id: true, chapeta: true, estado: true, fechaEntrada: true },
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
  /** Junta las filas por animal que salieron de un mismo guardado. */
  claveTanda: string
  tipo: TipoEventoSanitario
  producto: string
  dosis: string | null
  responsable: string
  fecha: FechaISO
  proximaFecha: FechaISO | null
  aQuienes: string
  vencida: boolean
  animalIds: string[]
}

/**
 * Cuatro campos identifican una tanda sin ambigüedad: un mismo producto no se
 * aplica dos veces el mismo día al mismo lote. No hace falta una columna
 * nueva en la base para agruparlas.
 */
function claveDeTanda(evento: {
  tipo: TipoEventoSanitario
  fecha: Date
  producto: string
  loteId: string | null
  animalId: string
}): string {
  return `${evento.tipo}|${aFechaISO(evento.fecha)}|${evento.producto}|${evento.loteId ?? evento.animalId}`
}

/**
 * La tabla "lo último que les has puesto": una fila por TANDA, no por animal.
 *
 * Desde que una aplicación de lote deja una fila por animal, mostrarlas sin
 * agrupar llenaría la pantalla con catorce líneas idénticas.
 */
export async function ultimasAplicaciones(
  loteId: string,
  hoy: FechaISO,
): Promise<AplicacionVista[]> {
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
    const proximaFecha = evento.proximaFecha ? aFechaISO(evento.proximaFecha) : null
    tandas.set(clave, {
      claveTanda: clave,
      tipo: evento.tipo,
      producto: evento.producto,
      dosis: evento.dosis,
      responsable: evento.responsable,
      fecha: aFechaISO(evento.fecha),
      proximaFecha,
      aQuienes: evento.lote ? evento.lote.nombre : `Solo ${evento.animal.chapeta}`,
      vencida: proximaFecha !== null && proximaFecha < hoy,
      animalIds: [evento.animalId],
    })
  }

  return [...tandas.values()].map((tanda) => ({
    ...tanda,
    aQuienes:
      tanda.animalIds.length > 1
        ? `${tanda.aQuienes} · ${tanda.animalIds.length} animales`
        : tanda.aQuienes,
  }))
}

/**
 * Anula una tanda entera. No borra: la fila sobrevive con su motivo para el
 * respaldo a Excel, igual que un pesaje o una novedad anulados.
 */
export async function anularAplicacion(
  animalIds: string[],
  claveTanda: string,
  motivo: string,
  usuarioId: string,
): Promise<void> {
  const motivoLimpio = motivo.trim()
  if (motivoLimpio === '') {
    throw new Error(
      'Anular una aplicación necesita un motivo: sin él, la anulación deja un hueco tan malo como el dato que quiso corregir.',
    )
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
