'use server'

import { revalidatePath } from 'next/cache'
import type { MetodoPesaje } from '@prisma/client'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import {
  anularPesaje,
  guardarPesaje,
  revisarTanda,
  type EntradaTanda,
  type RevisionTanda,
} from '@/datos/pesajes'

/**
 * Lo que se revisó, capturado tal cual llegó en el envío de "Revisar": la
 * fecha, el método, el responsable, las notas y cada peso digitado. Es lo
 * único de lo que puede partir `guardarAccion` -- ver el comentario grande
 * en `TablaPesaje.tsx` sobre por qué no puede volver a leer el `<form>` para
 * el segundo envío.
 */
export type DatosRevisados = {
  fecha: string
  metodo: MetodoPesaje
  responsable: string
  notas: string | null
  mediciones: EntradaTanda[]
}

export type EstadoDigitacion = {
  revision: RevisionTanda[]
  datosRevisados: DatosRevisados | null
  guardado: boolean
  error: string | null
}

export type EstadoAnulacion = {
  anulado: boolean
  error: string | null
}

/** Lee los campos `peso_<animalId>` del formulario, ignorando los vacíos. */
function leerEntradas(datos: FormData) {
  const entradas: { animalId: string; pesoKg: number }[] = []
  for (const [campo, valor] of datos.entries()) {
    if (!campo.startsWith('peso_')) continue
    const texto = String(valor).trim().replace(',', '.')
    if (texto === '') continue
    entradas.push({ animalId: campo.slice('peso_'.length), pesoKg: Number(texto) })
  }
  return entradas
}

export async function revisarAccion(
  _estado: EstadoDigitacion,
  datos: FormData,
): Promise<EstadoDigitacion> {
  const fecha = String(datos.get('fecha'))
  const entradas = leerEntradas(datos)
  if (entradas.length === 0) {
    return { revision: [], datosRevisados: null, guardado: false, error: 'No hay ningún peso digitado.' }
  }
  const datosRevisados: DatosRevisados = {
    fecha,
    metodo: String(datos.get('metodo')) as MetodoPesaje,
    responsable: String(datos.get('responsable')),
    notas: (String(datos.get('notas')) || null) as string | null,
    mediciones: entradas,
  }
  return {
    revision: await revisarTanda(entradas, fecha, hoyBogota()),
    datosRevisados,
    guardado: false,
    error: null,
  }
}

/**
 * A propósito, recibe `DatosRevisados` -- el objeto que ya viajó al servidor
 * (y volvió) en la revisión -- y no `FormData`. Un Server Action puede
 * recibir cualquier argumento serializable, no solo el `FormData` de un
 * envío nativo: eso es lo que permite que `TablaPesaje` invoque esta acción
 * pasándole directamente lo que se revisó, en vez de tener que releer el
 * `<form>` (que React ya vació) por segunda vez. Ver el comentario grande en
 * `TablaPesaje.tsx`.
 */
export async function guardarAccion(
  _estado: EstadoDigitacion,
  datos: DatosRevisados,
): Promise<EstadoDigitacion> {
  const usuario = await usuarioActual()
  try {
    await guardarPesaje(
      {
        fecha: datos.fecha,
        metodo: datos.metodo,
        responsable: datos.responsable,
        notas: datos.notas,
        registradoPorId: usuario.id,
        mediciones: datos.mediciones,
      },
      hoyBogota(),
    )
    revalidatePath('/como-vamos')
    revalidatePath('/')
    revalidatePath('/digitar')
    return { revision: [], datosRevisados: null, guardado: true, error: null }
  } catch (error) {
    return { revision: [], datosRevisados: null, guardado: false, error: (error as Error).message }
  }
}

/**
 * Anula una sesión completa de pesaje. No borra nada -- ver `anularPesaje`
 * en `src/datos/pesajes.ts`. Revalida las mismas pantallas que guardar un
 * pesaje nuevo, porque anular tiene el mismo alcance: cambia el último peso
 * por animal, la ganancia diaria y todo lo que se calcula a partir de eso.
 */
export async function anularAccion(
  _estado: EstadoAnulacion,
  datos: FormData,
): Promise<EstadoAnulacion> {
  const usuario = await usuarioActual()
  try {
    await anularPesaje(String(datos.get('pesajeId')), String(datos.get('motivo')), usuario.id)
  } catch (error) {
    return { anulado: false, error: (error as Error).message }
  }
  revalidatePath('/como-vamos')
  revalidatePath('/')
  revalidatePath('/digitar')
  return { anulado: true, error: null }
}
