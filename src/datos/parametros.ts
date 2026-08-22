import type { Umbrales } from '@/calc/clasificacion'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO } from './conversion'

/**
 * Devuelve el valor de la clave vigente en la fecha dada, o null si no había ninguno.
 *
 * Ordena primero por fecha de vigencia y, entre filas con la misma vigencia, por
 * fecha de creación descendente: corregir un umbral mal escrito significa insertar
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
 * Se lanza cuando falta un parámetro obligatorio. Es una subclase de `Error` (no
 * un `Error` a secas) para que quien la atrape — hoy, la portada — pueda
 * distinguirla con `instanceof` de cualquier otro fallo inesperado y no termine
 * ocultando un bug real detrás de un mensaje de "falta configurar".
 */
export class ParametroFaltanteError extends Error {
  constructor(
    public readonly clave: string,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ParametroFaltanteError'
  }
}

async function exigir(clave: string, en: FechaISO): Promise<number> {
  const valor = await leerParametro(clave, en)
  if (valor === null) {
    throw new ParametroFaltanteError(
      clave,
      `Falta el parámetro ${clave} vigente en ${en}. Configúralo antes de continuar.`,
    )
  }
  const numero = Number(valor)
  // Un umbral guardado como texto no numérico no puede colar como NaN: `gdp
  // >= NaN` es siempre falso, y eso clasificaría a todos los animales como
  // 'critico' sin que nadie se entere de que la causa es un dato mal
  // guardado. Se rechaza igual que un parámetro ausente.
  if (!Number.isFinite(numero)) {
    throw new ParametroFaltanteError(
      clave,
      `El parámetro ${clave} vigente en ${en} no es un número (quedó guardado "${valor}"). Corrígelo antes de continuar.`,
    )
  }
  return numero
}

/**
 * Arma los umbrales del semáforo desde la base.
 *
 * Si falta uno, lanza en lugar de usar un valor por omisión: un umbral inventado
 * clasificaría animales con un criterio que nadie decidió.
 */
export async function leerUmbrales(en: FechaISO): Promise<Umbrales> {
  return {
    excelente: await exigir('umbral_excelente', en),
    bueno: await exigir('umbral_bueno', en),
    normal: await exigir('umbral_normal', en),
    bajo: await exigir('umbral_bajo', en),
  }
}

/**
 * Objetivo de ganancia diaria configurado, o null si nadie lo ha configurado
 * o si quedó guardado un valor que no es un número finito.
 *
 * A diferencia de `leerUmbrales`, un objetivo ausente no impide seguir
 * mostrando el resto de la pantalla: por eso no lanza, sino que devuelve
 * null para que cada pantalla decida cómo mostrar "sin dato". Lo que no
 * puede hacer es inventar un cero: un objetivo de 0 g/día haría que la
 * finca "cumpliera" siempre, contra una meta que nadie fijó.
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

/** Las cuatro claves del semáforo, en el orden en que tienen que quedar: cada una mayor que la siguiente. */
export const CLAVES_UMBRAL = ['umbral_excelente', 'umbral_bueno', 'umbral_normal', 'umbral_bajo'] as const
type ClaveUmbral = (typeof CLAVES_UMBRAL)[number]

function esClaveUmbral(clave: string): clave is ClaveUmbral {
  return (CLAVES_UMBRAL as readonly string[]).includes(clave)
}

async function valoresUmbralEfectivos(
  en: FechaISO,
  cambios: Partial<Record<ClaveUmbral, number>>,
): Promise<Record<ClaveUmbral, number | null>> {
  const resultado = {} as Record<ClaveUmbral, number | null>
  for (const clave of CLAVES_UMBRAL) {
    if (clave in cambios) {
      resultado[clave] = cambios[clave]!
      continue
    }
    const guardado = await leerParametro(clave, en)
    resultado[clave] = guardado === null ? null : Number(guardado)
  }
  return resultado
}

/**
 * Verifica excelente > bueno > normal > bajo entre los umbrales vigentes en
 * la fecha `en` (mezclando `cambios`, el que se está por guardar, con lo
 * que ya está guardado para los otros tres). Compara TODOS los pares en
 * orden, no solo los vecinos consecutivos: si "bueno" todavía no está
 * configurado, la única forma de atrapar "excelente" por debajo de "normal"
 * es comparándolos directamente, porque el par excelente-bueno y el par
 * bueno-normal quedan sin poder evaluarse. Un umbral que aún no tiene valor
 * vigente en esa fecha no entra en ninguna comparación: no se le puede
 * exigir un orden a algo que no existe todavía.
 */
async function validarOrdenUmbrales(
  en: FechaISO,
  cambios: Partial<Record<ClaveUmbral, number>>,
): Promise<void> {
  const valores = await valoresUmbralEfectivos(en, cambios)
  for (let i = 0; i < CLAVES_UMBRAL.length; i++) {
    for (let j = i + 1; j < CLAVES_UMBRAL.length; j++) {
      const claveMayor = CLAVES_UMBRAL[i]
      const claveMenor = CLAVES_UMBRAL[j]
      const vMayor = valores[claveMayor]
      const vMenor = valores[claveMenor]
      if (vMayor !== null && vMenor !== null && vMayor <= vMenor) {
        throw new Error(
          `El umbral "${claveMayor}" (${vMayor}) tiene que ser mayor que "${claveMenor}" (${vMenor}) ` +
            `vigente el ${en}; si no, la clasificación del semáforo queda incoherente.`,
        )
      }
    }
  }
}

/**
 * Valida un cambio sin guardarlo: el valor tiene que ser un número, y si la
 * clave es uno de los cuatro umbrales, tiene que conservar el orden frente
 * a los otros tres vigentes en la misma fecha. La usa tanto
 * `revisarCambioParametro` (para avisar antes de guardar) como
 * `configurarParametro` (para no guardar nunca un valor inválido).
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
  if (esClaveUmbral(clave)) {
    await validarOrdenUmbrales(vigenteDesde, { [clave]: numero } as Partial<Record<ClaveUmbral, number>>)
  }
  return numero
}

/**
 * ¿Este cambio va a dejar la clave sin ningún valor vigente hoy? Guardar un
 * parámetro nunca borra ni invalida uno anterior (los parámetros son
 * de solo agregar), así que la única forma de que esto pase es que la
 * vigencia elegida sea futura y que, hoy, todavía no exista ningún valor
 * anterior cubriendo la clave -- por ejemplo, la primera vez que se
 * configura un umbral y se le puso una fecha de arranque futura.
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
