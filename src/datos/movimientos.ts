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
  // `findUnique` + verificación manual, no `findUniqueOrThrow`: dos personas
  // pueden estar usando la plataforma a la vez, y si el potrero se anula o
  // se borra mientras este formulario sigue abierto en otra pantalla, el
  // identificador que llega aquí queda obsoleto. `findUniqueOrThrow` dejaría
  // pasar hasta la pantalla el texto crudo de Prisma, en inglés y sin
  // sentido para el ganadero -- este mensaje sí le sirve para entender qué
  // pasó y qué hacer (recargar).
  const potrero = await prisma.potrero.findUnique({ where: { id: potreroDestinoId } })
  if (!potrero) {
    throw new Error(
      'Este potrero ya no existe o cambió mientras tenías el formulario abierto. Recarga la página e intenta de nuevo.',
    )
  }

  const ocupantes = await prisma.lote.findMany({
    where: { potreroActualId: potreroDestinoId, fechaCierre: null },
    select: { id: true },
  })
  const pesos = await pesoVivoPorLote()
  const pesoLote = pesos.get(loteId) ?? 0
  // Lo que importa no es solo el lote que se mueve: es la carga total que
  // queda sobre el potrero, sumando lo que ya está encima del destino.
  const pesoOcupantesActuales = ocupantes
    .filter((ocupante) => ocupante.id !== loteId)
    .reduce((total, ocupante) => total + (pesos.get(ocupante.id) ?? 0), 0)
  const pesoResultante = pesoOcupantesActuales + pesoLote

  const estadoResultante = evaluarCapacidad(pesoResultante, potrero.capacidadKg)

  if (estadoResultante === 'sobrecargado') {
    return {
      permitido: true,
      estadoResultante,
      mensaje: `${potrero.nombre} quedaría sobrecargado: ${Math.round(pesoResultante)} kg vivos contra una capacidad de ${potrero.capacidadKg} kg.`,
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
  // Misma razón que en `revisarMovimiento`: el lote pudo cerrarse o
  // borrarse entre que se abrió el formulario y que se envió. El mensaje
  // traducido reemplaza el error crudo de Prisma que antes llegaba a la
  // pantalla sin traducir.
  const lote = await prisma.lote.findUnique({ where: { id: datos.loteId } })
  if (!lote) {
    throw new Error(
      'Este lote ya no existe o cambió mientras tenías el formulario abierto. Recarga la página e intenta de nuevo.',
    )
  }

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
