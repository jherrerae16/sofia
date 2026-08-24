import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

/**
 * Devuelve el valor de la clave vigente en la fecha dada, o null si no había ninguno.
 *
 * Ordena primero por fecha de vigencia y, entre filas con la misma vigencia, por
 * fecha de creación descendente: corregir un criterio mal escrito significa insertar
 * una segunda fila con la misma vigenteDesde, y sin este desempate cuál gana
 * dependería del plan de ejecución de la base de datos, no del código.
 */
export async function leerParametro(clave: string, en: FechaISO): Promise<string | null> {
  const fila = await prisma.parametro.findFirst({
    where: { clave, vigenteDesde: { lte: aFechaDb(en) } },
    orderBy: [{ vigenteDesde: 'desc' }, { creadoEn: 'desc' }],
  })
  return fila?.valor ?? null
}

export async function guardarParametro(
  clave: string,
  valor: string,
  vigenteDesde: FechaISO,
  usuarioId: string,
): Promise<void> {
  await prisma.parametro.create({
    data: { clave, valor, vigenteDesde: aFechaDb(vigenteDesde), creadoPorId: usuarioId },
  })
}

/**
 * Objetivo de ganancia diaria configurado, o null si nadie lo ha configurado
 * o si quedó guardado un valor que no es un número finito.
 *
 * Es la meta contra la cual se decide si un animal va bien o va quedado, así
 * que un objetivo ausente no impide mostrar el resto de la pantalla: devuelve
 * null y cada pantalla decide cómo mostrar "sin dato" -- lo que no puede hacer
 * es inventar un cero, porque con un objetivo de 0 g/día la finca "cumpliría"
 * siempre, contra una meta que nadie fijó.
 */
export async function leerGdpObjetivo(en: FechaISO): Promise<number | null> {
  const valor = await leerParametro('gdp_objetivo', en)
  if (valor === null) return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

export type FilaHistorialParametro = {
  valor: string
  vigenteDesde: FechaISO
}

/** Todas las vigencias que ha tenido una clave, de la más reciente a la más antigua. */
export async function historialParametro(clave: string): Promise<FilaHistorialParametro[]> {
  const filas = await prisma.parametro.findMany({
    where: { clave },
    orderBy: [{ vigenteDesde: 'desc' }, { creadoEn: 'desc' }],
  })
  return filas.map((fila) => ({ valor: fila.valor, vigenteDesde: aFechaISO(fila.vigenteDesde) }))
}

export type EstadoParametro = {
  clave: string
  valorVigente: string | null
  vigenteDesde: FechaISO | null
  historial: FilaHistorialParametro[]
}

/**
 * El valor vigente hoy de una clave, junto con desde cuándo rige y su
 * histórico completo -- lo que necesita la pantalla de configuración para
 * mostrar tanto "esto es lo que aplica ahora mismo" como "esto es lo que ha
 * tenido antes". El histórico ya viene ordenado como lo resuelve
 * `leerParametro`, así que el primero cuya vigencia ya llegó es el vigente.
 */
export async function estadoParametro(clave: string, hoy: FechaISO): Promise<EstadoParametro> {
  const historial = await historialParametro(clave)
  const vigente = historial.find((fila) => fila.vigenteDesde <= hoy) ?? null
  return {
    clave,
    valorVigente: vigente?.valor ?? null,
    vigenteDesde: vigente?.vigenteDesde ?? null,
    historial,
  }
}

/**
 * Las hectáreas útiles de la finca, movidas aquí desde el campo suelto que
 * tenía `Finca` -- sin esta clave, no llevaban vigencia ni autor, y
 * corregirlas reescribía en el sitio la carga animal de ciclos ya cerrados.
 * Como parámetro más, se comparten `configurarParametro`, `estadoParametro`
 * y el resto de la maquinaria con los otros dos; lo único propio es que tiene
 * que ser mayor que cero.
 */
export const CLAVE_HECTAREAS_UTILES = 'hectareas_utiles'

/**
 * El peso a partir del cual un novillo aparece como listo para vender.
 *
 * Puede no estar configurado, y eso no es un error: mientras no lo esté,
 * ninguna pantalla puede decir que un animal "está listo" -- sería una
 * opinión de la plataforma sobre cuándo vender, que es justo la decisión que
 * el dueño no delegó.
 */
export const CLAVE_PESO_VENTA = 'peso_objetivo_venta_kg'

/**
 * Valida un cambio sin guardarlo: el valor tiene que ser un número, y las
 * hectáreas además tienen que ser mayores que cero. La usa tanto
 * `revisarCambioParametro` (para avisar antes de guardar) como
 * `configurarParametro` (para no guardar nunca un valor inválido).
 *
 * Aquí vivía el orden entre los cuatro umbrales del semáforo. Se fue con
 * ellos: con la meta de ganancia diaria como único criterio no hay orden que
 * conservar, porque un número suelto no puede contradecir a otro.
 */
export async function validarCambioParametro(
  clave: string,
  valorTexto: string,
  vigenteDesde: FechaISO,
): Promise<number> {
  const numero = Number(valorTexto)
  if (!Number.isFinite(numero)) {
    throw new Error(`El valor "${valorTexto}" no es un número.`)
  }
  if (clave === CLAVE_HECTAREAS_UTILES && numero <= 0) {
    throw new Error(`Las hectáreas útiles deben ser mayor que cero (se recibió "${valorTexto}").`)
  }
  return numero
}

/**
 * ¿Este cambio va a dejar la clave sin ningún valor vigente hoy? Guardar un
 * parámetro nunca borra ni invalida uno anterior (los parámetros son
 * de solo agregar), así que la única forma de que esto pase es que la
 * vigencia elegida sea futura y que, hoy, todavía no exista ningún valor
 * anterior cubriendo la clave -- por ejemplo, la primera vez que se
 * configura un criterio y se le puso una fecha de arranque futura.
 */
export async function dejaSinVigenteHoy(
  clave: string,
  vigenteDesde: FechaISO,
  hoy: FechaISO,
): Promise<boolean> {
  if (vigenteDesde <= hoy) return false
  return (await leerParametro(clave, hoy)) === null
}

export type RevisionParametro = {
  numero: number
  dejaSinVigenteHoy: boolean
}

/**
 * Revisa un cambio sin guardarlo: valida (lanza si el valor no sirve) y
 * calcula el aviso de "esto deja la clave sin valor vigente hoy". La
 * pantalla de configuración la usa para poder pedir confirmación antes de
 * escribir cuando ese aviso aplica, igual que "Revisar movimiento" en
 * potreros.
 */
export async function revisarCambioParametro(
  clave: string,
  valorTexto: string,
  vigenteDesde: FechaISO,
  hoy: FechaISO,
): Promise<RevisionParametro> {
  const numero = await validarCambioParametro(clave, valorTexto, vigenteDesde)
  return { numero, dejaSinVigenteHoy: await dejaSinVigenteHoy(clave, vigenteDesde, hoy) }
}

/**
 * Valida y guarda. Es la única puerta de escritura que usa la pantalla de
 * configuración -- a diferencia de `guardarParametro`, que no valida nada
 * (lo siguen usando las pruebas y, hasta hoy, la consola, para poder seguir
 * sembrando valores inválidos a propósito y probar la guardia de lectura).
 */
export async function configurarParametro(
  clave: string,
  valorTexto: string,
  vigenteDesde: FechaISO,
  usuarioId: string,
): Promise<void> {
  const numero = await validarCambioParametro(clave, valorTexto, vigenteDesde)
  await guardarParametro(clave, String(numero), vigenteDesde, usuarioId)
}
