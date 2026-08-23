import { prisma } from './cliente'

/**
 * Limpia todas las tablas operativas (todo lo que cuelga, directa o
 * indirectamente, de `Lote` y `Potrero`) en el único orden que respeta las
 * llaves foráneas del esquema: hijos antes que padres.
 *
 * Existe porque las pruebas de `src/datos` comparten una sola base de datos
 * y corren en secuencia, nunca en paralelo (`fileParallelism: false` en
 * `vitest.config.ts`) -- así que el `beforeEach` de cada archivo no solo
 * tiene que limpiar lo que ESE archivo usa, sino cualquier fila que haya
 * dejado el archivo anterior y que las llaves foráneas de las tablas que va
 * a borrar toquen. Antes cada archivo mantenía su propia lista de
 * `deleteMany`, copiada y pegada, y esa lista se quedó corta dos veces
 * distintas al crecer el esquema -- primero con `Movimiento`, después con
 * `EventoSanitario` (ver el comentario que quedó en `sanidad.test.ts` sobre
 * ese segundo hueco) -- y una tercera vez con `novedades.test.ts`, que
 * borraba `Animal` sin haber borrado antes `Medicion` ni `Pesaje`. Con caché
 * caliente Vitest ordena los archivos por duración y el orden accidental
 * escondía el hueco; en frío ordena por tamaño y revienta con "Foreign key
 * constraint violated". Centralizar la lista una sola vez, en este único
 * lugar y en el orden correcto, es lo que evita que vuelva a quedar corta.
 *
 * Grafo de llaves foráneas relevante (hijo -> padre):
 *   Medicion -> Pesaje, Animal
 *   EventoSanitario -> Animal (obligatorio), Lote (opcional)
 *   Movimiento -> Lote, Potrero
 *   Novedad -> Lote, Potrero
 *   Animal -> Lote
 *   Lote -> Potrero
 *
 * `Parametro` y `Finca` quedan fuera a propósito: no tienen ninguna llave
 * foránea hacia ellas ni desde ellas, así que no participan de este
 * problema y cada archivo que las usa (`parametros.test.ts`,
 * `finca.test.ts`, y el `parametro.deleteMany()` propio de
 * `desempeno.test.ts`) las limpia por su cuenta sin riesgo de orden.
 */
export async function limpiarTablasOperativas(): Promise<void> {
  await prisma.medicion.deleteMany()
  await prisma.eventoSanitario.deleteMany()
  await prisma.movimiento.deleteMany()
  await prisma.novedad.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  await prisma.potrero.deleteMany()
}
