'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { moverLote, revisarMovimiento, type AvisoMovimiento } from '@/datos/movimientos'
import { crearPotrero } from '@/datos/potreros'

/**
 * Lo que se revisó, capturado tal cual llegó en el envío de "Revisar
 * movimiento": el lote, el potrero de destino y la fecha. Es lo único de lo
 * que puede partir `moverLoteAccion` -- ver el comentario grande en
 * `MoverLoteForm.tsx` sobre por qué no puede volver a leer el `<form>` para
 * el segundo envío.
 */
export type DatosMovimientoRevisado = {
  loteId: string
  potreroDestinoId: string
  fecha: string
}

export type EstadoMovimiento = {
  aviso: AvisoMovimiento | null
  datosRevisados: DatosMovimientoRevisado | null
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
  const fecha = String(datos.get('fecha'))
  try {
    const aviso = await revisarMovimiento(loteId, potreroDestinoId)
    return { aviso, datosRevisados: { loteId, potreroDestinoId, fecha }, movido: false, error: null }
  } catch (error) {
    return { aviso: null, datosRevisados: null, movido: false, error: (error as Error).message }
  }
}

/**
 * A propósito, recibe `DatosMovimientoRevisado` -- el objeto que ya viajó al
 * servidor (y volvió) en la revisión -- y no `FormData`. Igual que en
 * `guardarAccion` de `src/app/digitar/acciones.ts`: `MoverLoteForm` invoca
 * esta acción pasándole directamente lo que se revisó, en vez de releer el
 * `<form>` (que React ya vació) por segunda vez.
 */
export async function moverLoteAccion(
  _estado: EstadoMovimiento,
  datos: DatosMovimientoRevisado,
): Promise<EstadoMovimiento> {
  const usuario = await usuarioActual()
  try {
    await moverLote({
      loteId: datos.loteId,
      potreroDestinoId: datos.potreroDestinoId,
      fecha: datos.fecha,
      registradoPorId: usuario.id,
    })
  } catch (error) {
    return { aviso: null, datosRevisados: null, movido: false, error: (error as Error).message }
  }
  revalidatePath('/anotar/mover')
  revalidatePath('/')
  return { aviso: null, datosRevisados: null, movido: true, error: null }
}
