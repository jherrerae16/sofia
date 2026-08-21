'use server'

import { revalidatePath } from 'next/cache'
import type { MetodoPesaje } from '@prisma/client'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { guardarPesaje, revisarTanda, type RevisionTanda } from '@/datos/pesajes'

export type EstadoDigitacion = {
  revision: RevisionTanda[]
  guardado: boolean
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
    return { revision: [], guardado: false, error: 'No hay ningún peso digitado.' }
  }
  return { revision: await revisarTanda(entradas, fecha, hoyBogota()), guardado: false, error: null }
}

export async function guardarAccion(
  _estado: EstadoDigitacion,
  datos: FormData,
): Promise<EstadoDigitacion> {
  const usuario = await usuarioActual()
  try {
    await guardarPesaje(
      {
        fecha: String(datos.get('fecha')),
        metodo: String(datos.get('metodo')) as MetodoPesaje,
        responsable: String(datos.get('responsable')),
        notas: (String(datos.get('notas')) || null) as string | null,
        registradoPorId: usuario.id,
        mediciones: leerEntradas(datos),
      },
      hoyBogota(),
    )
    revalidatePath('/como-vamos')
    revalidatePath('/')
    return { revision: [], guardado: true, error: null }
  } catch (error) {
    return { revision: [], guardado: false, error: (error as Error).message }
  }
}
