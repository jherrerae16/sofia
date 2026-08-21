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
