'use server'

import type { TipoEventoSanitario } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { anularAplicacion, registrarEvento } from '@/datos/sanidad'

export type DatosSanidadEnviados = {
  tipo: string
  producto: string
  dosis: string
  fecha: string
  responsable: string
  proximaFecha: string
  notas: string
  alcance: 'lote' | 'algunos'
  loteId: string
  animalIds: string[]
}

export type EstadoSanidad = {
  guardadas: number | null
  /**
   * Lo que se envió, capturado tal cual llegó, para repoblar el formulario si
   * el guardado se rechaza. Mismo motivo que en los demás modos de Anotar: el
   * dueño anota por tandas, y perder lo ya escrito por un solo error lo
   * obligaría a volver a escribirlo todo.
   */
  datosEnviados: DatosSanidadEnviados | null
  error: string | null
}

// Los estados iniciales viven en los componentes de cliente, no aquí: un
// archivo 'use server' solo puede exportar funciones asíncronas.

export async function registrarSanidadAccion(
  _estado: EstadoSanidad,
  datos: FormData,
): Promise<EstadoSanidad> {
  const usuario = await usuarioActual()
  const enviados: DatosSanidadEnviados = {
    tipo: String(datos.get('tipo') ?? ''),
    producto: String(datos.get('producto') ?? ''),
    dosis: String(datos.get('dosis') ?? ''),
    fecha: String(datos.get('fecha') ?? ''),
    responsable: String(datos.get('responsable') ?? ''),
    proximaFecha: String(datos.get('proximaFecha') ?? ''),
    notas: String(datos.get('notas') ?? ''),
    alcance: datos.get('alcance') === 'algunos' ? 'algunos' : 'lote',
    loteId: String(datos.get('loteId') ?? ''),
    animalIds: datos.getAll('animalIds').map(String),
  }

  // Se valida aquí y no solo en el navegador: el `required` del HTML no
  // protege contra una petición hecha a mano, y una vacuna sin producto es un
  // récord que no sirve para nada -- es justo el dato que el dueño va a
  // buscar dentro de seis meses.
  if (enviados.producto.trim() === '') {
    return { guardadas: null, datosEnviados: enviados, error: 'Escribe qué producto se aplicó.' }
  }
  if (enviados.responsable.trim() === '') {
    return { guardadas: null, datosEnviados: enviados, error: 'Escribe quién lo aplicó.' }
  }
  if (enviados.alcance === 'algunos' && enviados.animalIds.length === 0) {
    return { guardadas: null, datosEnviados: enviados, error: 'Marca al menos una chapeta.' }
  }

  const comun = {
    tipo: enviados.tipo as TipoEventoSanitario,
    fecha: enviados.fecha,
    producto: enviados.producto.trim(),
    dosis: enviados.dosis.trim() || null,
    responsable: enviados.responsable.trim(),
    proximaFecha: enviados.proximaFecha || null,
    notas: enviados.notas.trim() || null,
    registradoPorId: usuario.id,
  }

  try {
    if (enviados.alcance === 'lote') {
      // `registrarEvento` con lote expande a una fila por animal activo que ya
      // hubiera entrado ese día: la regla de a quién le tocó vive en la capa
      // de datos, no aquí.
      await registrarEvento({ ...comun, animalId: null, loteId: enviados.loteId })
    } else {
      for (const animalId of enviados.animalIds) {
        await registrarEvento({ ...comun, animalId, loteId: null })
      }
    }
  } catch (error) {
    return {
      guardadas: null,
      datosEnviados: enviados,
      error: error instanceof Error ? error.message : 'No se pudo guardar la aplicación.',
    }
  }

  revalidatePath('/anotar/sanidad')
  revalidatePath('/')
  return { guardadas: enviados.animalIds.length || null, datosEnviados: null, error: null }
}

export type EstadoAnulacionSanidad = { anulada: boolean; error: string | null }

export async function anularSanidadAccion(
  _estado: EstadoAnulacionSanidad,
  datos: FormData,
): Promise<EstadoAnulacionSanidad> {
  const usuario = await usuarioActual()
  try {
    await anularAplicacion(
      datos.getAll('animalIds').map(String),
      String(datos.get('claveTanda') ?? ''),
      String(datos.get('motivo') ?? ''),
      usuario.id,
    )
  } catch (error) {
    return {
      anulada: false,
      error: error instanceof Error ? error.message : 'No se pudo anular la aplicación.',
    }
  }

  revalidatePath('/anotar/sanidad')
  revalidatePath('/')
  return { anulada: true, error: null }
}
