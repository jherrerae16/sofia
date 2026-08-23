import { prisma } from './cliente'

export type FincaVista = {
  nombre: string
}

/**
 * La finca es única -- toda la plataforma es de un solo dueño.
 *
 * `hectareasUtiles` vivió aquí como campo suelto hasta que se detectó que,
 * al no llevar vigencia, corregirlo reescribía hacia atrás la carga animal
 * de ciclos ya cerrados. Ahora vive en `Parametro`, bajo la clave
 * 'hectareas_utiles': ver `src/datos/parametros.ts` y
 * `prisma/migrations/20260823001813_hectareas_utiles_a_parametro/`.
 */
export async function obtenerFinca(): Promise<FincaVista | null> {
  const finca = await prisma.finca.findFirst()
  if (!finca) return null
  return { nombre: finca.nombre }
}
