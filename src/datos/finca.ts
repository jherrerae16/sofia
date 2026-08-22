import { prisma } from './cliente'
import { aNumero } from './conversion'

export type FincaVista = {
  nombre: string
  hectareasUtiles: number
}

/** La finca es única -- toda la plataforma es de un solo dueño. */
export async function obtenerFinca(): Promise<FincaVista | null> {
  const finca = await prisma.finca.findFirst()
  if (!finca) return null
  return { nombre: finca.nombre, hectareasUtiles: aNumero(finca.hectareasUtiles) }
}

/**
 * Actualiza en el sitio las hectáreas útiles de la finca. A diferencia de
 * los seis parámetros de `Parametro`, `hectareasUtiles` no lleva vigencia:
 * el esquema le da a `Finca` un solo valor, así que corregirlo sobrescribe
 * en vez de agregar una fila nueva -- no hay histórico que mostrar para
 * este dato, ni una fecha de "desde cuándo".
 */
export async function actualizarHectareasUtiles(valorTexto: string): Promise<void> {
  const numero = Number(valorTexto)
  if (!Number.isFinite(numero)) {
    throw new Error(`El valor "${valorTexto}" no es un número.`)
  }
  if (numero <= 0) {
    throw new Error(`Las hectáreas útiles deben ser mayor que cero (se recibió "${valorTexto}").`)
  }
  const { count } = await prisma.finca.updateMany({ data: { hectareasUtiles: numero } })
  if (count === 0) {
    throw new Error('Todavía no hay ninguna finca configurada en la base de datos.')
  }
}
