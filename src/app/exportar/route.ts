import { usuarioActual } from '@/auth'
import { hoyBogota } from '@/calc/fechas'
import { datosExportacionCompleta } from '@/datos/exportacion'
import { construirLibroExcel } from './construirLibro'

// Nunca cacheado ni prerenderizado: cada descarga tiene que reflejar la base
// en el momento exacto en que se pide, no una foto vieja del build. Mismo
// motivo que `export const dynamic = 'force-dynamic'` en la pantalla de
// Configuración.
export const dynamic = 'force-dynamic'
// Prisma necesita el runtime de Node.js, no el Edge (ver el comentario en
// `src/middleware.ts` sobre la misma razón).
export const runtime = 'nodejs'

/**
 * La salida del dueño: todo lo que hay en la base, en un solo `.xlsx` con
 * una hoja por cosa. `src/middleware.ts` ya exige sesión para llegar hasta
 * acá -- `usuarioActual()` no está para autorizar (eso ya pasó), sino para
 * que, si alguna vez esta ruta se llama sin pasar por el middleware, falle
 * cerrado en vez de servir el respaldo completo de la finca a quien sea.
 */
export async function GET() {
  await usuarioActual()

  const datos = await datosExportacionCompleta()
  const libro = await construirLibroExcel(datos)
  const nombreArchivo = `santa-veronica-${hoyBogota()}.xlsx`

  // `Response` (de la API Web que usan los Route Handlers) exige un
  // `ArrayBuffer`/`BufferSource` de verdad como cuerpo -- el `Buffer` de
  // Node.js es en tiempo de ejecución una vista sobre uno, pero su tipo en
  // TypeScript (genérico sobre `ArrayBufferLike`) no encaja con el tipo de
  // `BufferSource` del DOM. `.slice()` copia solo los bytes que en verdad
  // ocupa este `Buffer` (no el buffer subyacente completo, que puede traer
  // capacidad de sobra) y entrega un `ArrayBuffer` sin ambigüedad de tipos.
  const cuerpo = libro.buffer.slice(libro.byteOffset, libro.byteOffset + libro.byteLength) as ArrayBuffer

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // `attachment` es lo que hace que el navegador lo descargue en vez de
      // intentar mostrarlo; el nombre entre comillas evita que un nombre con
      // espacios (no es el caso hoy, pero sí lo sería con otro nombre de
      // finca) rompa el encabezado.
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Content-Length': String(libro.length),
    },
  })
}
