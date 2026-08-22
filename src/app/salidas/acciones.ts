'use server'

import { revalidatePath } from 'next/cache'
import { hoyBogota } from '@/calc/fechas'
import { registrarSalida, type EstadoSalida } from '@/datos/animales'

/**
 * Lo que se envió, capturado tal cual llegó -- la selección de chapetas, el
 * motivo, la fecha y cada peso de venta digitado -- para poder repoblar el
 * formulario si `registrarSalida` rechaza la tanda. Mismo motivo que
 * `DatosRevisados` en `src/app/digitar/acciones.ts`: con hasta 56 casillas
 * marcadas, perder la selección entera por un solo error (una chapeta que ya
 * había salido, una fecha mal escrita) obligaría a repetir todo el trabajo.
 */
export type DatosSalidaEnviados = {
  animalIds: string[]
  estado: EstadoSalida
  fechaSalida: string
  motivoSalida: string
  pesos: Record<string, string>
}

export type EstadoRegistroSalida = {
  registrado: boolean
  cantidad: number
  datosEnviados: DatosSalidaEnviados | null
  error: string | null
}

function leerSeleccion(datos: FormData): string[] {
  const ids: string[] = []
  for (const [campo, valor] of datos.entries()) {
    if (!campo.startsWith('sel_')) continue
    if (valor !== 'on') continue
    ids.push(campo.slice('sel_'.length))
  }
  return ids
}

/** Lee los campos `peso_<animalId>` del formulario, ignorando los vacíos. */
function leerPesos(
  datos: FormData,
  animalIds: string[],
): { numeros: Record<string, number>; textos: Record<string, string> } {
  const numeros: Record<string, number> = {}
  const textos: Record<string, string> = {}
  for (const animalId of animalIds) {
    const texto = String(datos.get(`peso_${animalId}`) ?? '').trim().replace(',', '.')
    textos[animalId] = texto
    if (texto === '') continue
    numeros[animalId] = Number(texto)
  }
  return { numeros, textos }
}

export async function registrarSalidaAccion(
  _estado: EstadoRegistroSalida,
  datos: FormData,
): Promise<EstadoRegistroSalida> {
  const animalIds = leerSeleccion(datos)
  const estado = String(datos.get('estado')) as EstadoSalida
  const fechaSalida = String(datos.get('fechaSalida'))
  const motivoSalida = String(datos.get('motivoSalida') ?? '')
  const { numeros, textos } = leerPesos(datos, animalIds)

  const datosEnviados: DatosSalidaEnviados = {
    animalIds,
    estado,
    fechaSalida,
    motivoSalida,
    pesos: textos,
  }

  if (animalIds.length === 0) {
    return {
      registrado: false,
      cantidad: 0,
      datosEnviados,
      error: 'Selecciona al menos un animal antes de registrar la salida.',
    }
  }

  try {
    const cantidad = await registrarSalida(
      {
        animalIds,
        estado,
        fechaSalida,
        motivoSalida: motivoSalida.trim() || null,
        pesosSalida: numeros,
      },
      hoyBogota(),
    )
    // Una salida cambia todo lo que cuenta animales activos: el lote de
    // origen, la digitación de pesajes (ya no debe listar al que salió), la
    // portada y "cómo vamos" (peso vivo, promedios, animales vivos), y el
    // potrero donde pastaba (carga).
    revalidatePath('/salidas')
    revalidatePath('/lotes')
    revalidatePath('/digitar')
    revalidatePath('/como-vamos')
    revalidatePath('/potreros')
    revalidatePath('/')
    return { registrado: true, cantidad, datosEnviados: null, error: null }
  } catch (error) {
    return { registrado: false, cantidad: 0, datosEnviados, error: (error as Error).message }
  }
}
