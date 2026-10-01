import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Las dos cuentas de la plataforma, fijas en el código y con el mismo poder.
 *
 * No hay registro, ni correo, ni recuperación de clave: la clave de cada uno
 * vive en una variable de entorno (en Vercel, o en `.env` en local), y
 * cambiarla es cambiar esa variable y volver a desplegar. La tabla `Usuario`
 * sigue existiendo solo para que cada registro guarde quién lo anotó; la
 * fila se crea sola la primera vez que la cuenta entra.
 */
export const USUARIOS = [
  { usuario: 'jherrera', nombre: 'Juan David', variable: 'CLAVE_JHERRERA' },
  { usuario: 'jvargas', nombre: 'Joseph', variable: 'CLAVE_JVARGAS' },
] as const

export type Cuenta = (typeof USUARIOS)[number]

// Se comparan los resúmenes y no las claves crudas: `timingSafeEqual` exige
// dos búferes del mismo largo, y comparar resúmenes de largo fijo evita
// además que el tiempo de respuesta delate cuántos caracteres tiene la clave.
function resumen(texto: string): Buffer {
  return createHash('sha256').update(texto).digest()
}

export function verificarClave(
  usuario: string,
  clave: string,
  entorno: Record<string, string | undefined> = process.env,
): Cuenta | null {
  const cuenta = USUARIOS.find((c) => c.usuario === usuario.toLowerCase().trim())
  const esperada = cuenta ? entorno[cuenta.variable] : undefined
  // Una variable vacía o ausente cierra la cuenta: si se olvidó configurarla
  // en Vercel, nadie entra con la clave vacía.
  const coincide = timingSafeEqual(resumen(clave), resumen(esperada || '\0sin-clave'))
  return cuenta && esperada && coincide ? cuenta : null
}
