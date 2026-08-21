'use server'

import { revalidatePath } from 'next/cache'
import type { TipoLote } from '@prisma/client'
import { crearAnimales } from '@/datos/animales'
import { crearLote } from '@/datos/lotes'

export async function crearLoteAccion(datos: FormData) {
  await crearLote({
    nombre: String(datos.get('nombre')),
    tipo: String(datos.get('tipo')) as TipoLote,
    fechaApertura: String(datos.get('fechaApertura')),
  })
  revalidatePath('/lotes')
}

/**
 * Recibe un bloque de texto con una línea por animal: `chapeta peso`.
 * Es la forma más rápida de vaciar la planilla del día de la compra, que es
 * cuando se chapetea y se pesa el lote entero de una sola vez.
 */
export async function crearAnimalesAccion(datos: FormData) {
  const lineas = String(datos.get('planilla'))
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')

  const chapetas: string[] = []
  const pesos: Record<string, number> = {}

  for (const linea of lineas) {
    // Se separa solo en la primera aparición de espacio, coma o punto y coma:
    // así el resto de la línea queda intacto para la coma decimal del peso
    // (ej. "002 158,5"), que de otro modo el split partiría en tres pedazos.
    const partes = linea.match(/^(\S+)[\s,;]+(.+)$/)
    if (!partes) {
      throw new Error(`Línea mal formada: "${linea}". Se espera "chapeta peso".`)
    }
    const [, chapeta, peso] = partes
    chapetas.push(chapeta)
    pesos[chapeta] = Number(peso.replace(',', '.'))
  }

  await crearAnimales({
    loteId: String(datos.get('loteId')),
    chapetas,
    sexo: String(datos.get('sexo')),
    raza: (String(datos.get('raza')) || null) as string | null,
    cruce: (String(datos.get('cruce')) || null) as string | null,
    proveedor: (String(datos.get('proveedor')) || null) as string | null,
    fechaEntrada: String(datos.get('fechaEntrada')),
    edadEntradaMeses: datos.get('edadEntradaMeses') ? Number(datos.get('edadEntradaMeses')) : null,
    pesos,
  })

  revalidatePath('/lotes')
  revalidatePath('/como-vamos')
}
