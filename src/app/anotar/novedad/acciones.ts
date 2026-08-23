'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { anularNovedad, cerrarSuministro, registrarHecho, registrarSuministro } from '@/datos/novedades'

export type TipoNovedadForm = 'hecho' | 'suministro'

/**
 * Lo que se envió, capturado tal cual llegó -- para poder repoblar el
 * formulario si el registro se rechaza (fecha futura, descripción vacía).
 * Mismo motivo que `DatosSalidaEnviados` en `src/app/salidas/acciones.ts`:
 * el dueño anota por tandas, y perder lo ya escrito por un solo error
 * obligaría a volver a escribirlo.
 */
export type DatosNovedadEnviados = {
  tipo: TipoNovedadForm
  fecha: string
  descripcion: string
  loteId: string
  potreroId: string
}

export type EstadoNovedad = {
  registrada: boolean
  datosEnviados: DatosNovedadEnviados | null
  error: string | null
}

/**
 * Una sola acción para las dos formas de anotar, no dos formularios: lee el
 * campo `tipo` (los dos radios de `NovedadForm`) y despacha a
 * `registrarHecho` o `registrarSuministro` según corresponda.
 */
export async function registrarNovedadAccion(
  _estado: EstadoNovedad,
  datos: FormData,
): Promise<EstadoNovedad> {
  const usuario = await usuarioActual()
  const tipo = String(datos.get('tipo')) as TipoNovedadForm
  const fecha = String(datos.get('fecha'))
  const descripcion = String(datos.get('descripcion') ?? '')
  const loteId = String(datos.get('loteId') ?? '')
  const potreroId = String(datos.get('potreroId') ?? '')

  const datosEnviados: DatosNovedadEnviados = { tipo, fecha, descripcion, loteId, potreroId }

  try {
    if (tipo === 'suministro') {
      await registrarSuministro(
        { fechaInicio: fecha, descripcion, loteId, registradoPorId: usuario.id },
        hoyBogota(),
      )
    } else {
      await registrarHecho(
        {
          fecha,
          descripcion,
          loteId: loteId || null,
          potreroId: potreroId || null,
          registradoPorId: usuario.id,
        },
        hoyBogota(),
      )
    }
  } catch (error) {
    return { registrada: false, datosEnviados, error: (error as Error).message }
  }

  revalidatePath('/anotar/novedad')
  revalidatePath('/')
  return { registrada: true, datosEnviados: null, error: null }
}

export type EstadoCierre = { cerrado: boolean; error: string | null }

/** Cierra un suministro: un evento normal de su ciclo de vida, no una anulación. */
export async function cerrarSuministroAccion(
  _estado: EstadoCierre,
  datos: FormData,
): Promise<EstadoCierre> {
  try {
    await cerrarSuministro(String(datos.get('id')), String(datos.get('fechaFin')), hoyBogota())
  } catch (error) {
    return { cerrado: false, error: (error as Error).message }
  }
  revalidatePath('/anotar/novedad')
  revalidatePath('/')
  return { cerrado: true, error: null }
}

export type EstadoAnulacionNovedad = { anulada: boolean; error: string | null }

/** Anula una novedad -- hecho o suministro. No borra nada, ver `anularNovedad`. */
export async function anularNovedadAccion(
  _estado: EstadoAnulacionNovedad,
  datos: FormData,
): Promise<EstadoAnulacionNovedad> {
  const usuario = await usuarioActual()
  try {
    await anularNovedad(String(datos.get('id')), String(datos.get('motivo')), usuario.id)
  } catch (error) {
    return { anulada: false, error: (error as Error).message }
  }
  revalidatePath('/anotar/novedad')
  revalidatePath('/')
  return { anulada: true, error: null }
}
