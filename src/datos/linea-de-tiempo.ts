import { clasificar, type Umbrales } from '@/calc/clasificacion'
import { gdpEntre, type Medicion } from '@/calc/gdp'
import type { FechaISO } from '@/calc/tipos'
import { ETIQUETA_ESTADO_ANIMAL, ETIQUETA_METODO_PESAJE, ETIQUETA_TIPO_EVENTO } from '@/ui/etiquetas'
import { capitalizar, formatearGdp, formatearKg } from '@/ui/formato'
import { prisma } from './cliente'
import { aFechaISO, aKg } from './conversion'
import { leerUmbrales, ParametroFaltanteError } from './parametros'
import { historialDeAnimal } from './pesajes'
import { eventosDeAnimal } from './sanidad'

export type Suceso = {
  fecha: FechaISO
  clase: 'entrada' | 'pesaje' | 'sanidad' | 'movimiento' | 'salida'
  /** La línea principal: "Pesaje con cinta", "Desparasitación · Ivermectina 1%". */
  que: string
  /** La línea chica de abajo: quién, la dosis, la próxima fecha. Null si no hay más que decir. */
  detalle: string | null
  /** La cifra de la derecha, si el suceso trae una. */
  cifra: string | null
  /** La cifra chica debajo de la anterior. */
  cifraChica: string | null
  /** Enciende el suceso en barro: un pesaje por debajo del umbral configurado. */
  malo: boolean
}

function juntar(...partes: (string | null)[]): string | null {
  const vivas = partes.filter((parte): parte is string => parte !== null && parte.trim() !== '')
  return vivas.length > 0 ? vivas.join(' · ') : null
}

/**
 * Todo lo que le ha pasado a un animal, de lo más reciente a lo más viejo.
 *
 * Es el orden en que el dueño lee la ficha: primero qué pasó la última vez.
 * Los movimientos son del lote y no del animal, así que se filtran a la
 * estadía real del animal -- un movimiento de antes de que entrara no le pasó
 * a él, y ponerlo en su historia es inventarle un pasado.
 */
export async function lineaDeTiempoDeAnimal(animalId: string, hoy: FechaISO): Promise<Suceso[]> {
  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id: animalId },
    select: {
      loteId: true,
      proveedor: true,
      fechaEntrada: true,
      pesoEntradaKg: true,
      edadEntradaMeses: true,
      estado: true,
      fechaSalida: true,
      motivoSalida: true,
      pesoSalidaKg: true,
    },
  })

  const entrada: Medicion = {
    fecha: aFechaISO(animal.fechaEntrada),
    pesoKg: aKg(animal.pesoEntradaKg),
  }
  const salida = animal.fechaSalida ? aFechaISO(animal.fechaSalida) : null

  const sucesos: Suceso[] = [
    {
      fecha: entrada.fecha,
      clase: 'entrada',
      que: 'Entró a la finca',
      detalle: juntar(
        animal.proveedor ? `Comprado en ${animal.proveedor}` : null,
        animal.edadEntradaMeses !== null ? `${animal.edadEntradaMeses} meses al entrar` : null,
      ),
      cifra: formatearKg(entrada.pesoKg),
      cifraChica: null,
      malo: false,
    },
  ]

  // --- Pesajes. Cada uno se mide contra el anterior, no contra la entrada:
  // la línea cuenta tramos. El primero no tiene más referencia que la entrada.
  // `leerUmbrales` lanza a propósito cuando no hay ninguno vigente, porque un
  // umbral inventado clasificaría animales con un criterio que nadie decidió.
  // Pero eso no puede tumbar la ficha entera: sin criterio no se dice quién va
  // mal, y todo lo demás de la historia sigue en pie.
  let umbrales: Umbrales | null = null
  try {
    umbrales = await leerUmbrales(hoy)
  } catch (error) {
    if (!(error instanceof ParametroFaltanteError)) throw error
  }

  const historial = await historialDeAnimal(animalId)
  const pesajes = await prisma.pesaje.findMany({
    where: { anuladoEn: null, mediciones: { some: { animalId } } },
    select: { fecha: true, metodo: true, responsable: true },
  })
  const detallePorFecha = new Map(pesajes.map((pesaje) => [aFechaISO(pesaje.fecha), pesaje]))

  historial.forEach((medicion, i) => {
    const anterior = i === 0 ? entrada : historial[i - 1]
    const gdp = gdpEntre(anterior, medicion)
    const pesaje = detallePorFecha.get(medicion.fecha)
    sucesos.push({
      fecha: medicion.fecha,
      clase: 'pesaje',
      que: pesaje ? `Pesaje con ${ETIQUETA_METODO_PESAJE[pesaje.metodo]}` : 'Pesaje',
      detalle: pesaje ? `Lo pesó ${pesaje.responsable}` : null,
      cifra: formatearKg(medicion.pesoKg),
      cifraChica: gdp === null ? null : formatearGdp(gdp),
      malo: umbrales !== null && ['bajo', 'critico'].includes(clasificar(gdp, umbrales)),
    })
  })

  // --- Sanidad. `eventosDeAnimal` ya excluye lo anulado.
  for (const evento of await eventosDeAnimal(animalId)) {
    sucesos.push({
      fecha: evento.fecha,
      clase: 'sanidad',
      que: `${capitalizar(ETIQUETA_TIPO_EVENTO[evento.tipo])}${evento.lote ? ' del lote' : ''} · ${evento.producto}`,
      detalle: juntar(
        evento.dosis,
        evento.responsable,
        evento.proximaFecha ? `próxima el ${evento.proximaFecha}` : null,
      ),
      cifra: null,
      cifraChica: null,
      malo: false,
    })
  }

  // --- Movimientos del lote, acotados a la estadía del animal.
  const movimientos = await prisma.movimiento.findMany({
    where: { loteId: animal.loteId },
    include: {
      potreroOrigen: { select: { nombre: true } },
      potreroDestino: { select: { nombre: true } },
    },
  })
  for (const movimiento of movimientos) {
    const fecha = aFechaISO(movimiento.fecha)
    if (fecha < entrada.fecha) continue
    if (salida !== null && fecha > salida) continue
    sucesos.push({
      fecha,
      clase: 'movimiento',
      que: movimiento.potreroOrigen
        ? `El lote pasó de ${movimiento.potreroOrigen.nombre} a ${movimiento.potreroDestino.nombre}`
        : `El lote entró a ${movimiento.potreroDestino.nombre}`,
      detalle: null,
      cifra: null,
      cifraChica: null,
      malo: false,
    })
  }

  // --- Salida.
  if (animal.estado !== 'activo' && salida !== null) {
    sucesos.push({
      fecha: salida,
      clase: 'salida',
      que: `${ETIQUETA_ESTADO_ANIMAL[animal.estado]} · salió de la finca`,
      detalle: animal.motivoSalida,
      cifra: animal.pesoSalidaKg ? formatearKg(aKg(animal.pesoSalidaKg)) : null,
      cifraChica: null,
      malo: animal.estado === 'muerto' || animal.estado === 'robado',
    })
  }

  // Lo más nuevo primero. Con dos sucesos del mismo día manda el orden en que
  // se agregaron arriba (entrada, pesaje, sanidad, movimiento, salida), que es
  // el orden en que ocurren dentro de un día de trabajo.
  return sucesos.sort((a, b) => b.fecha.localeCompare(a.fecha))
}
