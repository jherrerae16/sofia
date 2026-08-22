import type { MetodoPesaje, TipoLote } from '@prisma/client'
import type { Medicion } from '@/calc/gdp'
import type { FechaISO } from '@/calc/tipos'
import { validarMedicion, veredictoMasGrave, type Nivel } from '@/calc/validacion'
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
  hoy: FechaISO,
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
      const nueva = { fecha, pesoKg: entrada.pesoKg }

      const veredicto = validarMedicion(
        { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) },
        anterior,
        nueva,
        hoy,
      )

      // Un pesaje digitado con retraso también tiene un tramo hacia
      // adelante: la medición inmediatamente posterior a la fecha digitada,
      // que ya estaba guardada. Mirar solo hacia atrás deja pasar un dedazo
      // que resulta invisible contra la medición anterior pero que es
      // físicamente imposible contra la que vino después. Se evalúa con las
      // mismas reglas (llamando a `validarMedicion` con la nueva medición
      // como si fuera la "entrada" y sin anterior, para que solo apliquen
      // los umbrales de ganancia y pérdida) y se queda con el veredicto más
      // grave. El `gdp` que se muestra sigue siendo el del tramo hacia
      // atrás: es la cifra que el usuario espera ver en su fila.
      const posterior = historial.find((m) => m.fecha > fecha) ?? null
      const veredictoPosterior = posterior
        ? validarMedicion(nueva, null, posterior, hoy, 'hacia_adelante')
        : null
      const definitivo = veredictoPosterior
        ? veredictoMasGrave(veredicto, veredictoPosterior)
        : veredicto

      return {
        animalId: animal.id,
        chapeta: animal.chapeta,
        nivel: definitivo.nivel,
        mensaje: definitivo.mensaje,
        gdp: veredicto.gdp,
      }
    }),
  )
}

export async function guardarPesaje(datos: DatosPesaje, hoy: FechaISO): Promise<string> {
  const revision = await revisarTanda(datos.mediciones, datos.fecha, hoy)
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

/**
 * Anula una sesión de pesaje completa: no borra nada, solo la marca fuera de
 * cuenta. Las mediciones se conservan en la base -- son las consultas que ya
 * filtran por `anuladoEn: null` (`historialDeAnimal`, `ultimoPesoPorAnimal`,
 * `frescura`) las que dejan de verlas. Exige un motivo no vacío: una
 * anulación sin explicación deja un hueco en los datos tan malo como el dato
 * que se quiso corregir, porque nadie sabrá después por qué desapareció.
 */
export async function anularPesaje(pesajeId: string, motivo: string, usuarioId: string): Promise<void> {
  const motivoLimpio = motivo.trim()
  if (motivoLimpio === '') {
    throw new Error('La anulación necesita un motivo: explica por qué este pesaje ya no cuenta.')
  }

  const pesaje = await prisma.pesaje.findUniqueOrThrow({ where: { id: pesajeId } })
  if (pesaje.anuladoEn) {
    throw new Error('Este pesaje ya está anulado.')
  }

  await prisma.pesaje.update({
    where: { id: pesajeId },
    data: { anuladoEn: new Date(), motivoAnulacion: motivoLimpio, anuladoPorId: usuarioId },
  })
}

export type ResumenPesaje = {
  id: string
  fecha: FechaISO
  metodo: MetodoPesaje
  responsable: string
  notas: string | null
  cantidadAnimales: number
  anuladoEn: FechaISO | null
  motivoAnulacion: string | null
}

/**
 * Las últimas sesiones de pesaje que tocaron animales de este lote, más
 * recientes primero. Es lo que necesita el ganadero para encontrar -- y
 * eventualmente anular -- la tanda que acaba de digitar mal, justo donde la
 * digitó: no hace falta ni un identificador de pesaje ni otra pantalla.
 * Incluye las ya anuladas, porque el rastro de que algo se anuló también
 * tiene que verse aquí.
 */
export async function listarPesajesDeLote(loteId: string, limite = 10): Promise<ResumenPesaje[]> {
  const pesajes = await prisma.pesaje.findMany({
    where: { mediciones: { some: { animal: { loteId } } } },
    include: { _count: { select: { mediciones: true } } },
    orderBy: { creadoEn: 'desc' },
    take: limite,
  })

  return pesajes.map((pesaje) => ({
    id: pesaje.id,
    fecha: aFechaISO(pesaje.fecha),
    metodo: pesaje.metodo,
    responsable: pesaje.responsable,
    notas: pesaje.notas,
    cantidadAnimales: pesaje._count.mediciones,
    anuladoEn: pesaje.anuladoEn ? aFechaISO(pesaje.anuladoEn) : null,
    motivoAnulacion: pesaje.motivoAnulacion,
  }))
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
 *
 * Sin `tipo`, suma lotes de cualquier tipo: es lo que necesita la carga sobre el
 * potrero, porque el pasto no distingue entre una vaca de leche y un novillo de
 * ceba. Con `tipo`, filtra a los lotes de ese tipo -- es lo que necesita una
 * pantalla como la portada, que solo debe contar el engorde bajo ese título.
 */
export async function pesoVivoPorLote(tipo?: TipoLote): Promise<Map<string, number>> {
  const animales = await prisma.animal.findMany({
    where: { estado: 'activo', ...(tipo ? { lote: { tipo } } : {}) },
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
