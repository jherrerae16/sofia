import type { EstadoCapacidad } from '@/calc/potrero'
import { diasDescanso, diasOcupacion, evaluarCapacidad } from '@/calc/potrero'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO, aNumero } from './conversion'
import { pesoVivoPorLote } from './pesajes'

export type PotreroVista = {
  id: string
  nombre: string
  hectareas: number
  capacidadKg: number
  loteActual: string | null
  diasOcupacion: number | null
  diasDescanso: number | null
  pesoVivoKg: number
  estadoCapacidad: EstadoCapacidad
}

export async function listarPotreros(hoy: FechaISO): Promise<PotreroVista[]> {
  const potreros = await prisma.potrero.findMany({
    where: { anuladoEn: null },
    include: { lotes: { select: { id: true, nombre: true, fechaEntradaPotrero: true } } },
    orderBy: { nombre: 'asc' },
  })

  const pesos = await pesoVivoPorLote()

  const ultimaSalida = new Map<string, FechaISO>()
  const salidas = await prisma.movimiento.findMany({
    where: { potreroOrigenId: { not: null } },
    orderBy: { fecha: 'desc' },
  })
  for (const salida of salidas) {
    if (salida.potreroOrigenId && !ultimaSalida.has(salida.potreroOrigenId)) {
      ultimaSalida.set(salida.potreroOrigenId, aFechaISO(salida.fecha))
    }
  }

  return potreros.map((potrero) => {
    const lote = potrero.lotes[0] ?? null
    const pesoVivoKg = lote ? (pesos.get(lote.id) ?? 0) : 0
    return {
      id: potrero.id,
      nombre: potrero.nombre,
      hectareas: aNumero(potrero.hectareas),
      capacidadKg: potrero.capacidadKg,
      loteActual: lote?.nombre ?? null,
      diasOcupacion:
        lote?.fechaEntradaPotrero ? diasOcupacion(aFechaISO(lote.fechaEntradaPotrero), hoy) : null,
      diasDescanso: lote ? null : diasDescanso(ultimaSalida.get(potrero.id) ?? null, hoy),
      pesoVivoKg,
      estadoCapacidad: evaluarCapacidad(pesoVivoKg, potrero.capacidadKg),
    }
  })
}
