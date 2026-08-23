'use server'

import { revalidatePath } from 'next/cache'
import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { configurarParametro, revisarCambioParametro } from '@/datos/parametros'
import { crearPotrero } from '@/datos/potreros'
import { DEFINICIONES_PARAMETRO } from './definiciones'

export async function crearPotreroAccion(datos: FormData) {
  await crearPotrero({
    nombre: String(datos.get('nombre')),
    hectareas: Number(String(datos.get('hectareas')).replace(',', '.')),
    capacidadKg: Number(datos.get('capacidadKg')),
    tipoPasto: (String(datos.get('tipoPasto')) || null) as string | null,
    tieneAgua: datos.get('tieneAgua') === 'on',
  })
  revalidatePath('/finca')
}

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
    // El campo `clave` viaja en un input oculto del formulario -- nada
    // impide en el HTML que llegue cualquier texto. No es explotable sin
    // sesión (`usuarioActual()` ya exige estar logueado más abajo), pero
    // contrastarlo contra la lista de parámetros que la pantalla en verdad
    // define es gratis, y evita que un futuro descuido en el formulario
    // termine escribiendo una clave que no aparece en ningún lado.
    if (!DEFINICIONES_PARAMETRO.some((definicion) => definicion.clave === clave)) {
      throw new Error(`"${clave}" no es un parámetro configurable.`)
    }

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

  revalidatePath('/finca')
  // Un cambio con vigencia hoy puede alterar de inmediato el semáforo y la
  // meta que se muestran en la portada y en "Cómo vamos".
  revalidatePath('/')
    return { valorEnviado: null, vigenteDesdeEnviada: null, aviso: null, guardado: true, error: null }
}
