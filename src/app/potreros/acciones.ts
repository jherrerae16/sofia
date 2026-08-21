'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { moverLote, revisarMovimiento } from '@/datos/movimientos'

export async function revisarMovimientoAccion(loteId: string, potreroDestinoId: string) {
  return revisarMovimiento(loteId, potreroDestinoId)
}

export async function moverLoteAccion(datos: FormData) {
  const usuario = await usuarioActual()
  await moverLote({
    loteId: String(datos.get('loteId')),
    potreroDestinoId: String(datos.get('potreroDestinoId')),
    fecha: String(datos.get('fecha')),
    registradoPorId: usuario.id,
  })
  revalidatePath('/potreros')
}
