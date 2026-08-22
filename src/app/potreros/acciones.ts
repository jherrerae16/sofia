'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { moverLote, revisarMovimiento, type AvisoMovimiento } from '@/datos/movimientos'
import { crearPotrero } from '@/datos/potreros'

export type EstadoMovimiento = {
  aviso: AvisoMovimiento | null
  movido: boolean
  error: string | null
}

/**
 * El aviso de capacidad se pide en un paso previo y se le muestra al
 * ganadero antes de confirmar: informa, no bloquea. `moverLoteAccion` no lo
 * vuelve a calcular -- el formulario ya lo mostró y el clic en "Mover lote"
 * es la confirmación.
 */
export async function revisarMovimientoAccion(
  _estado: EstadoMovimiento,
  datos: FormData,
): Promise<EstadoMovimiento> {
  const loteId = String(datos.get('loteId'))
  const potreroDestinoId = String(datos.get('potreroDestinoId'))
  try {
    const aviso = await revisarMovimiento(loteId, potreroDestinoId)
    return { aviso, movido: false, error: null }
  } catch (error) {
    return { aviso: null, movido: false, error: (error as Error).message }
  }
}

export async function moverLoteAccion(
  _estado: EstadoMovimiento,
  datos: FormData,
): Promise<EstadoMovimiento> {
  const usuario = await usuarioActual()
  try {
    await moverLote({
      loteId: String(datos.get('loteId')),
      potreroDestinoId: String(datos.get('potreroDestinoId')),
      fecha: String(datos.get('fecha')),
      registradoPorId: usuario.id,
    })
  } catch (error) {
    return { aviso: null, movido: false, error: (error as Error).message }
  }
  revalidatePath('/potreros')
  return { aviso: null, movido: true, error: null }
}

export async function crearPotreroAccion(datos: FormData) {
  await crearPotrero({
    nombre: String(datos.get('nombre')),
    hectareas: Number(String(datos.get('hectareas')).replace(',', '.')),
    capacidadKg: Number(datos.get('capacidadKg')),
    tipoPasto: (String(datos.get('tipoPasto')) || null) as string | null,
    tieneAgua: datos.get('tieneAgua') === 'on',
  })
  revalidatePath('/potreros')
}
