import type { EstadoAnimal } from '@prisma/client'
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
