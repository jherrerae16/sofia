import type { MetodoPesaje } from '@prisma/client'
import type { Medicion } from '@/calc/gdp'
import type { FechaISO } from '@/calc/tipos'
import { validarMedicion, type Nivel } from '@/calc/validacion'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO, aKg } from './conversion'

export type EntradaTanda = { animalId: string; pesoKg: number }

export type RevisionTanda = {
  animalId: string
  chapeta: string
  nivel: Nivel
  mensaje: string
  gdp: number | null
}

export type DatosPesaje = {
  fecha: FechaISO
  metodo: MetodoPesaje
  responsable: string
  notas: string | null
  registradoPorId: string
  mediciones: EntradaTanda[]
}

export async function historialDeAnimal(animalId: string): Promise<Medicion[]> {
  const filas = await prisma.medicion.findMany({
    where: { animalId, pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
    orderBy: { pesaje: { fecha: 'asc' } },
  })
  return filas.map((fila) => ({ fecha: aFechaISO(fila.pesaje.fecha), pesoKg: aKg(fila.pesoKg) }))
}

/**
 * Evalúa una tanda completa antes de guardarla y devuelve, por animal, la ganancia
 * diaria que resultaría. Es lo que se le muestra al usuario para que cace el dedazo
 * en el momento, y no tres meses después cuando ya contaminó el costo por kilogramo.
 */
export async function revisarTanda(
  entradas: EntradaTanda[],
  fecha: FechaISO,
): Promise<RevisionTanda[]> {
  const animales = await prisma.animal.findMany({
    where: { id: { in: entradas.map((e) => e.animalId) } },
    select: { id: true, chapeta: true, fechaEntrada: true, pesoEntradaKg: true },
  })
  const porId = new Map(animales.map((a) => [a.id, a]))

  return Promise.all(
    entradas.map(async (entrada) => {
      const animal = porId.get(entrada.animalId)
      if (!animal) {
        return {
          animalId: entrada.animalId,
          chapeta: '?',
          nivel: 'rechazo' as const,
          mensaje: 'El animal no existe.',
          gdp: null,
        }
      }

      const historial = await historialDeAnimal(animal.id)
      // Se incluye una medición de la misma fecha (no solo las estrictamente
      // anteriores): si ya existe una, `anterior` queda apuntando a ella y
      // `validarMedicion` la rechaza por "mismo día" más abajo. Filtrarla aquí
      // la volvía invisible para esa regla y dejaba colar reenvíos duplicados
      // de la tanda completa. Cuando no hay duplicado, el resultado es el
      // mismo de siempre: la última medición estrictamente anterior.
      const previas = historial.filter((m) => m.fecha <= fecha)
      const anterior = previas.at(-1) ?? null

      const veredicto = validarMedicion(
        { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) },
        anterior,
        { fecha, pesoKg: entrada.pesoKg },
      )

      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        nivel: veredicto.nivel,
        mensaje: veredicto.mensaje,
        gdp: veredicto.gdp,
      }
    }),
  )
}

export async function guardarPesaje(datos: DatosPesaje): Promise<string> {
  const revision = await revisarTanda(datos.mediciones, datos.fecha)
  const rechazos = revision.filter((r) => r.nivel === 'rechazo')
  if (rechazos.length > 0) {
    throw new Error(
      `No se guardó nada. ${rechazos.length} medición(es) rechazada(s): ` +
        rechazos.map((r) => `${r.chapeta} — ${r.mensaje}`).join(' | '),
    )
  }

  const pesaje = await prisma.pesaje.create({
    data: {
      fecha: aFechaDb(datos.fecha),
      metodo: datos.metodo,
      responsable: datos.responsable,
      notas: datos.notas,
      registradoPorId: datos.registradoPorId,
      mediciones: {
        create: datos.mediciones.map((m) => ({ animalId: m.animalId, pesoKg: m.pesoKg })),
      },
    },
  })

  return pesaje.id
}

export async function ultimoPesoPorAnimal(): Promise<Map<string, Medicion>> {
  const filas = await prisma.medicion.findMany({
    where: { pesaje: { anuladoEn: null } },
    include: { pesaje: { select: { fecha: true } } },
    orderBy: { pesaje: { fecha: 'asc' } },
  })

  const ultimo = new Map<string, Medicion>()
  for (const fila of filas) {
    ultimo.set(fila.animalId, { fecha: aFechaISO(fila.pesaje.fecha), pesoKg: aKg(fila.pesoKg) })
  }
  return ultimo
}

/**
 * Peso vivo de cada lote. Un animal sin ningún pesaje cuenta con su peso de entrada:
 * excluirlo subestimaría la carga sobre el potrero, que es una alerta de manejo real.
 */
export async function pesoVivoPorLote(): Promise<Map<string, number>> {
  const animales = await prisma.animal.findMany({
    where: { estado: 'activo' },
    select: { id: true, loteId: true, pesoEntradaKg: true },
  })
  const ultimos = await ultimoPesoPorAnimal()

  const total = new Map<string, number>()
  for (const animal of animales) {
    const peso = ultimos.get(animal.id)?.pesoKg ?? aKg(animal.pesoEntradaKg)
    total.set(animal.loteId, (total.get(animal.loteId) ?? 0) + peso)
  }
  return total
}
