import { Prisma, type EstadoAnimal } from '@prisma/client'
import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO, aKg } from './conversion'

export type DatosAlta = {
  loteId: string
  chapetas: string[]
  sexo: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  edadEntradaMeses: number | null
  pesos: Record<string, number>
}

export type AnimalVista = {
  id: string
  chapeta: string
  loteId: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  pesoEntradaKg: number
  estado: EstadoAnimal
}

/**
 * Da de alta un lote completo en una sola transacción.
 * O entran todos o no entra ninguno: un alta a medias deja el lote descuadrado
 * y obliga a adivinar cuáles chapetas faltaron.
 */
export async function crearAnimales(datos: DatosAlta): Promise<number> {
  for (const chapeta of datos.chapetas) {
    const peso = datos.pesos[chapeta]
    if (peso === undefined) {
      throw new Error(`Falta el peso de entrada de la chapeta ${chapeta}.`)
    }
    // Un texto no numérico digitado por error (p. ej. "15o" en vez de "150")
    // llega aquí como NaN, no como `undefined` -- y `NaN <= 0` es `false`,
    // así que sin este chequeo colaba hasta Prisma con un error genérico que
    // no le dice al ganadero qué línea de la planilla corregir. Misma
    // guardia que ya existe en `validarMedicion` para el mismo error.
    if (!Number.isFinite(peso)) {
      throw new Error(`El peso de entrada de la chapeta ${chapeta} no es un número.`)
    }
    if (peso <= 0) {
      throw new Error(`El peso de entrada de la chapeta ${chapeta} debe ser mayor que cero.`)
    }
  }

  await prisma.$transaction(
    datos.chapetas.map((chapeta) =>
      prisma.animal.create({
        data: {
          chapeta,
          loteId: datos.loteId,
          sexo: datos.sexo,
          raza: datos.raza,
          cruce: datos.cruce,
          proveedor: datos.proveedor,
          fechaEntrada: aFechaDb(datos.fechaEntrada),
          edadEntradaMeses: datos.edadEntradaMeses,
          pesoEntradaKg: datos.pesos[chapeta],
        },
      }),
    ),
  )

  return datos.chapetas.length
}

export type EstadoSalida = Exclude<EstadoAnimal, 'activo'>

export type DatosSalida = {
  animalIds: string[]
  estado: EstadoSalida
  fechaSalida: FechaISO
  /** Obligatorio para muerte y robo; opcional para venta. */
  motivoSalida: string | null
  /**
   * Último peso real del animal, por id. Cabe naturalmente aquí porque es un
   * dato de engorde -- no de plata: el precio, el comprador y las comisiones
   * son del plan 2. Un animal sin entrada en este mapa queda con
   * `pesoSalidaKg` en null.
   */
  pesosSalida: Record<string, number>
}

/**
 * Saca uno o varios animales de un lote a la vez: venta, muerte o robo. Es lo
 * que le permite al ganadero vender el lote completo el mismo día de la
 * feria en una sola operación, con la fecha y el motivo compartidos por
 * todos los animales seleccionados.
 *
 * O salen todos o no sale ninguno, igual que `crearAnimales`: una salida a
 * medias -- 54 animales vendidos y 2 todavía "activos" por un fallo a mitad
 * de camino -- deja el lote descuadrado y obliga a adivinar cuáles faltaron.
 */
export async function registrarSalida(datos: DatosSalida, hoy: FechaISO): Promise<number> {
  if (datos.animalIds.length === 0) {
    throw new Error('No se seleccionó ningún animal para registrar la salida.')
  }

  const motivoLimpio = datos.motivoSalida?.trim() || null
  if ((datos.estado === 'muerto' || datos.estado === 'robado') && motivoLimpio === null) {
    throw new Error(
      `Registrar un animal como ${datos.estado} necesita un motivo: explica qué pasó.`,
    )
  }

  if (diasEntre(hoy, datos.fechaSalida) > 0) {
    throw new Error('La fecha de salida no puede ser posterior a hoy.')
  }

  const animales = await prisma.animal.findMany({
    where: { id: { in: datos.animalIds } },
    select: { id: true, chapeta: true, estado: true, fechaEntrada: true },
  })
  const porId = new Map(animales.map((a) => [a.id, a]))

  // Se valida por chapeta, no por id, para que el mensaje de error le sirva
  // al ganadero sin tener que ir a buscar a qué animal corresponde el id.
  for (const animalId of datos.animalIds) {
    const animal = porId.get(animalId)
    if (!animal) {
      throw new Error(`El animal ${animalId} no existe.`)
    }
    if (animal.estado !== 'activo') {
      throw new Error(`La chapeta ${animal.chapeta} ya salió (${animal.estado}); no puede volver a salir.`)
    }
    if (diasEntre(aFechaISO(animal.fechaEntrada), datos.fechaSalida) < 0) {
      throw new Error(
        `La chapeta ${animal.chapeta} no puede salir antes de su fecha de entrada (${aFechaISO(animal.fechaEntrada)}).`,
      )
    }
  }

  for (const [animalId, peso] of Object.entries(datos.pesosSalida)) {
    const chapeta = porId.get(animalId)?.chapeta ?? animalId
    if (!Number.isFinite(peso)) {
      throw new Error(`El peso de venta de la chapeta ${chapeta} no es un número.`)
    }
    if (peso <= 0) {
      throw new Error(`El peso de venta de la chapeta ${chapeta} debe ser mayor que cero.`)
    }
  }

  // La condición `estado: 'activo'` va en el propio `where` de cada `update`,
  // no en un chequeo previo separado: es la base de datos, no el proceso de
  // Node, la que garantiza que dos salidas concurrentes sobre el mismo animal
  // (dos pestañas, un doble clic) no puedan pisarse. El chequeo de arriba
  // (contra lo que se leyó hace un instante) ya cubre el caso normal y da un
  // mensaje con la chapeta; esta guardia cubre la carrera que ese chequeo no
  // puede ver. Si alguna pierde la carrera, `update` no encuentra fila, Prisma
  // lo reporta como `P2025` y toda la tanda se revierte -- mismo patrón que
  // `anularPesaje` en `src/datos/pesajes.ts`.
  try {
    await prisma.$transaction(
      datos.animalIds.map((animalId) =>
        prisma.animal.update({
          where: { id: animalId, estado: 'activo' },
          data: {
            estado: datos.estado,
            fechaSalida: aFechaDb(datos.fechaSalida),
            motivoSalida: motivoLimpio,
            pesoSalidaKg: datos.pesosSalida[animalId] ?? null,
          },
        }),
      ),
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error(
        'No se registró ninguna salida: al menos un animal de la tanda ya había salido antes de terminar de guardar.',
      )
    }
    throw error
  }

  return datos.animalIds.length
}

export async function listarAnimalesDeLote(loteId: string): Promise<AnimalVista[]> {
  const animales = await prisma.animal.findMany({
    where: { loteId },
    orderBy: { chapeta: 'asc' },
  })

  return animales.map((animal) => ({
    id: animal.id,
    chapeta: animal.chapeta,
    loteId: animal.loteId,
    raza: animal.raza,
    cruce: animal.cruce,
    proveedor: animal.proveedor,
    fechaEntrada: aFechaISO(animal.fechaEntrada),
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    estado: animal.estado,
  }))
}
