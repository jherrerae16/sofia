'use client' // Los límites de error deben ser componentes de cliente.

import { useEffect } from 'react'

/**
 * Pantalla de error general de toda la aplicación. Antes de esto, cualquier
 * fallo inesperado (uno que ninguna pantalla atrapa a propósito, como sí
 * hace la portada con `ParametroFaltanteError`) le mostraba al ganadero la
 * pantalla técnica en inglés por omisión de Next. Este archivo envuelve
 * todas las rutas bajo el layout raíz (no hay más layouts anidados en esta
 * aplicación), así que el encabezado con la navegación sigue visible y el
 * ganadero puede irse a otra pantalla aunque esta se haya roto.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="p-6">
      <div className="mx-auto max-w-lg rounded-lg border border-alerta/40 bg-papel p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold text-alerta">Algo salió mal</h1>
        <p className="mb-4 text-sm text-carbon/70">
          Esta pantalla no pudo cargar por un problema inesperado. No es necesariamente algo que
          hiciste: puede ser un problema pasajero de conexión con la base de datos. Intenta de
          nuevo, y si el problema sigue, avísale a quien administra SOFIA.
        </p>
        <button
          onClick={() => retry()}
          className="rounded bg-monte px-6 py-3 text-[14px] font-semibold text-papel"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  )
}
