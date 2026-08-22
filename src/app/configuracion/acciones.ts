'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { actualizarHectareasUtiles } from '@/datos/finca'
import { configurarParametro, revisarCambioParametro } from '@/datos/parametros'

/**
 * Lo que se envió, capturado tal cual llegó -- para poder repoblar el
 * formulario si el guardado se rechaza o si hace falta pedir confirmación.
 * React vacía los campos no controlados del `<form>` en cuanto se envía
 * (ver el comentario grande en `TablaPesaje.tsx`), así que sin esto el
 * segundo envío (el de "Guardar de todas formas") mostraría los campos en
 * blanco en vez de lo que el ganadero ya escribió.
 */
export type EstadoFormularioParametro = {
  valorEnviado: string | null
  vigenteDesdeEnviada: string | null
  /** No vacío cuando el cambio dejaría la clave sin ningún valor vigente hoy: hace falta confirmar. */
  aviso: string | null
  guardado: boolean
  error: string | null
}

/**
 * Guarda un parámetro, en un solo paso salvo que el cambio deje la clave
 * sin ningún valor vigente hoy -- ahí pide confirmación (`confirmado`
 * llega en '1' cuando el ganadero ya la dio) en vez de bloquear, porque una
 * vigencia futura es una decisión legítima. La validación de número y de
 * orden entre los umbrales corre siempre, confirmado o no: lo único que se
 * salta con la confirmación es el aviso, nunca la validación.
 */
export async function guardarParametroAccion(
  _estado: EstadoFormularioParametro,
  datos: FormData,
): Promise<EstadoFormularioParametro> {
  const clave = String(datos.get('clave'))
  const valorTexto = String(datos.get('valor')).trim().replace(',', '.')
  const vigenteDesde = String(datos.get('vigenteDesde'))
  const confirmado = datos.get('confirmado') === '1'
  const hoy = hoyBogota()

  try {
    if (!confirmado) {
      const revision = await revisarCambioParametro(clave, valorTexto, vigenteDesde, hoy)
      if (revision.dejaSinVigenteHoy) {
        return {
          valorEnviado: valorTexto,
          vigenteDesdeEnviada: vigenteDesde,
          aviso: `Con el ${vigenteDesde} de vigencia, este parámetro se queda sin ningún valor configurado hoy hasta que llegue esa fecha. ¿Confirmas de todas formas?`,
          guardado: false,
          error: null,
        }
      }
    }

    const usuario = await usuarioActual()
    await configurarParametro(clave, valorTexto, vigenteDesde, usuario.id)
  } catch (error) {
    return {
      valorEnviado: valorTexto,
      vigenteDesdeEnviada: vigenteDesde,
      aviso: null,
      guardado: false,
      error: (error as Error).message,
    }
  }

  revalidatePath('/configuracion')
  // Un cambio con vigencia hoy puede alterar de inmediato el semáforo y la
  // meta que se muestran en la portada y en "Cómo vamos".
  revalidatePath('/')
  revalidatePath('/como-vamos')
  return { valorEnviado: null, vigenteDesdeEnviada: null, aviso: null, guardado: true, error: null }
}

export type EstadoHectareas = {
  valorEnviado: string | null
  guardado: boolean
  error: string | null
}

export async function actualizarHectareasAccion(
  _estado: EstadoHectareas,
  datos: FormData,
): Promise<EstadoHectareas> {
  const valorTexto = String(datos.get('hectareasUtiles')).trim().replace(',', '.')
  try {
    await actualizarHectareasUtiles(valorTexto)
  } catch (error) {
    return { valorEnviado: valorTexto, guardado: false, error: (error as Error).message }
  }
  revalidatePath('/configuracion')
  return { valorEnviado: null, guardado: true, error: null }
}
