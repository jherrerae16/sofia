'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { leerValorEnPesos } from '@/calc/gastos'
import { anularGasto, registrarGasto } from '@/datos/gastos'

/** Lo que se envió, para repoblar el formulario si el gasto se rechaza. */
export type DatosGastoEnviados = { fecha: string; descripcion: string; valor: string }

export type EstadoGasto = {
  /** Lo que se acaba de anotar, para confirmarlo en pantalla. */
  anotado: { descripcion: string; valor: number } | null
  /** La fecha se queda puesta después de anotar: se anota por tandas. */
  fecha: string | null
  datosEnviados: DatosGastoEnviados | null
  error: string | null
}

export async function registrarGastoAccion(_estado: EstadoGasto, datos: FormData): Promise<EstadoGasto> {
  const usuario = await usuarioActual()
  const enviados: DatosGastoEnviados = {
    fecha: String(datos.get('fecha') ?? ''),
    descripcion: String(datos.get('descripcion') ?? ''),
    valor: String(datos.get('valor') ?? ''),
  }

  const valor = leerValorEnPesos(enviados.valor)
  try {
    if (valor === null && enviados.descripcion.trim() !== '') {
      throw new Error('Falta el valor. Escríbelo en pesos, sin centavos.')
    }
    await registrarGasto(
      { fecha: enviados.fecha, descripcion: enviados.descripcion, valor: valor ?? 0, registradoPorId: usuario.id },
      hoyBogota(),
    )
  } catch (error) {
    return { anotado: null, fecha: null, datosEnviados: enviados, error: (error as Error).message }
  }

  revalidatePath('/anotar/gasto')
  return {
    anotado: { descripcion: enviados.descripcion.trim(), valor: valor ?? 0 },
    fecha: enviados.fecha,
    datosEnviados: null,
    error: null,
  }
}

export type EstadoAnulacionGasto = { anulado: boolean; error: string | null }

export async function anularGastoAccion(
  _estado: EstadoAnulacionGasto,
  datos: FormData,
): Promise<EstadoAnulacionGasto> {
  const usuario = await usuarioActual()
  try {
    await anularGasto(String(datos.get('id')), String(datos.get('motivo') ?? ''), usuario.id)
  } catch (error) {
    return { anulado: false, error: (error as Error).message }
  }
  revalidatePath('/anotar/gasto')
  return { anulado: true, error: null }
}
