'use server'

import { revalidatePath } from 'next/cache'
import type { TipoLote } from '@prisma/client'
import {
  ChapetaDuplicadaError,
  crearAnimales,
  PesoEntradaSospechosoError,
  type AdvertenciaPesoEntrada,
  type ConflictoChapeta,
} from '@/datos/animales'
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
 * Lo que se envió, capturado tal cual llegó -- la planilla completa y el
 * resto de los campos -- para poder repoblar el formulario si `crearAnimales`
 * rechaza la tanda. Con hasta 56 líneas pegadas de una planilla, perder todo
 * el bloque por una sola chapeta en conflicto obligaría a volver a pegarlo
 * entero: el dueño solo debería tener que corregir las líneas señaladas.
 */
export type DatosAltaEnviados = {
  loteId: string
  sexo: string
  raza: string
  cruce: string
  proveedor: string
  edadEntradaMeses: string
  fechaEntrada: string
  planilla: string
}

export type EstadoAlta = {
  creados: number | null
  datosEnviados: DatosAltaEnviados | null
  conflictos: ConflictoChapeta[]
  error: string | null
  /**
   * Uno o más pesos de entrada de la tanda quedan fuera del rango típico de
   * un novillo de ceba -- ver `PesoEntradaSospechosoError` en
   * `src/datos/animales.ts`. No es un `error`: nada se rechazó de plano, se
   * frenó a la espera de que el dueño confirme que el peso está bien tal
   * como se digitó.
   */
  advertencias: AdvertenciaPesoEntrada[] | null
}

/**
 * Recibe un bloque de texto con una línea por animal: `chapeta peso`.
 * Es la forma más rápida de vaciar la planilla del día de la compra, que es
 * cuando se chapetea y se pesa el lote entero de una sola vez.
 */
export async function crearAnimalesAccion(_estado: EstadoAlta, datos: FormData): Promise<EstadoAlta> {
  const planilla = String(datos.get('planilla'))
  const datosEnviados: DatosAltaEnviados = {
    loteId: String(datos.get('loteId')),
    sexo: String(datos.get('sexo')),
    raza: String(datos.get('raza') ?? ''),
    cruce: String(datos.get('cruce') ?? ''),
    proveedor: String(datos.get('proveedor') ?? ''),
    edadEntradaMeses: String(datos.get('edadEntradaMeses') ?? ''),
    fechaEntrada: String(datos.get('fechaEntrada')),
    planilla,
  }

  const lineas = planilla
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')

  const chapetas: string[] = []
  const pesos: Record<string, number> = {}
  // El único campo de este formulario que no viene de un `<input>` normal:
  // es una casilla que solo se muestra (y solo importa) después de una
  // advertencia de peso de entrada -- ver el comentario grande en
  // `AltaAnimalesForm.tsx`. A propósito no se guarda en `datosEnviados`
  // para repoblarla marcada de por sí en el siguiente envío: cada tanda
  // exige su propia confirmación explícita, para no entrenar al dueño a
  // marcarla sin leer.
  const confirmarPesosSospechosos = datos.get('confirmarPesosSospechosos') === 'on'

  try {
    for (const linea of lineas) {
      // Se separa solo en la primera aparición de espacio, coma o punto y
      // coma: así el resto de la línea queda intacto para la coma decimal
      // del peso (ej. "002 158,5"), que de otro modo el split partiría en
      // tres pedazos.
      const partes = linea.match(/^(\S+)[\s,;]+(.+)$/)
      if (!partes) {
        throw new Error(`Línea mal formada: "${linea}". Se espera "chapeta peso".`)
      }
      const [, chapeta, peso] = partes
      chapetas.push(chapeta)
      pesos[chapeta] = Number(peso.replace(',', '.'))
    }

    const creados = await crearAnimales({
      loteId: datosEnviados.loteId,
      chapetas,
      sexo: datosEnviados.sexo,
      raza: datosEnviados.raza || null,
      cruce: datosEnviados.cruce || null,
      proveedor: datosEnviados.proveedor || null,
      fechaEntrada: datosEnviados.fechaEntrada,
      edadEntradaMeses: datosEnviados.edadEntradaMeses ? Number(datosEnviados.edadEntradaMeses) : null,
      pesos,
      confirmarPesosSospechosos,
    })

    revalidatePath('/lotes')
    revalidatePath('/como-vamos')
    return { creados, datosEnviados: null, conflictos: [], error: null, advertencias: null }
  } catch (error) {
    if (error instanceof ChapetaDuplicadaError) {
      return {
        creados: null,
        datosEnviados,
        conflictos: error.conflictos,
        error: error.message,
        advertencias: null,
      }
    }
    if (error instanceof PesoEntradaSospechosoError) {
      return {
        creados: null,
        datosEnviados,
        conflictos: [],
        error: null,
        advertencias: error.advertencias,
      }
    }
    return {
      creados: null,
      datosEnviados,
      conflictos: [],
      error: (error as Error).message,
      advertencias: null,
    }
  }
}
