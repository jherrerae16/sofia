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
  /** Qué pasto tiene y si tiene agua: lo primero que se mira antes de mandarle un lote. */
  tipoPasto: string | null
  tieneAgua: boolean
  lotesOcupantes: string[]
  diasOcupacion: number | null
  diasDescanso: number | null
  pesoVivoKg: number
  estadoCapacidad: EstadoCapacidad
}

export async function listarPotreros(hoy: FechaISO): Promise<PotreroVista[]> {
  const potreros = await prisma.potrero.findMany({
    where: { anuladoEn: null },
    include: {
      // Un lote cerrado ya no come de este potrero: si no se filtra aquí,
      // seguiría figurando como ocupante para siempre.
      lotes: {
        where: { fechaCierre: null },
        select: { id: true, nombre: true, fechaEntradaPotrero: true },
      },
    },
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
    const ocupantes = potrero.lotes
    // El peso vivo del potrero es la suma de TODOS sus ocupantes, no solo el
    // primero: dos lotes pueden compartir potrero mientras rotan, y ambos
    // comen del mismo pasto.
    const pesoVivoKg = ocupantes.reduce((total, lote) => total + (pesos.get(lote.id) ?? 0), 0)

    // Con varios ocupantes, el potrero lleva sin descansar desde que entró
    // el primero de ellos: se usa la fecha de entrada más antigua.
    const fechasEntrada = ocupantes
      .map((lote) => lote.fechaEntradaPotrero)
      .filter((fecha): fecha is Date => fecha !== null)
    const entradaMasAntigua =
      fechasEntrada.length > 0
        ? aFechaISO(fechasEntrada.reduce((mas_antigua, fecha) => (fecha < mas_antigua ? fecha : mas_antigua)))
        : null

    return {
      id: potrero.id,
      nombre: potrero.nombre,
      hectareas: aNumero(potrero.hectareas),
      capacidadKg: potrero.capacidadKg,
      tipoPasto: potrero.tipoPasto,
      tieneAgua: potrero.tieneAgua,
      lotesOcupantes: ocupantes.map((lote) => lote.nombre),
      diasOcupacion: entradaMasAntigua ? diasOcupacion(entradaMasAntigua, hoy) : null,
      diasDescanso:
        ocupantes.length === 0 ? diasDescanso(ultimaSalida.get(potrero.id) ?? null, hoy) : null,
      pesoVivoKg,
      estadoCapacidad: evaluarCapacidad(pesoVivoKg, potrero.capacidadKg),
    }
  })
}

export async function crearPotrero(datos: {
  nombre: string
  hectareas: number
  capacidadKg: number
  tipoPasto: string | null
  tieneAgua: boolean
}): Promise<string> {
  const potrero = await prisma.potrero.create({
    data: {
      nombre: datos.nombre,
      hectareas: datos.hectareas,
      capacidadKg: datos.capacidadKg,
      tipoPasto: datos.tipoPasto,
      tieneAgua: datos.tieneAgua,
    },
  })
  return potrero.id
}
