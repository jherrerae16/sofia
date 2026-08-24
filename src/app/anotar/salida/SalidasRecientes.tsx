import type { AnimalVista } from '@/datos/animales'
import { formatearKg } from '@/ui/formato'

const ETIQUETA_ESTADO: Record<string, string> = {
  vendido: 'Vendido',
  muerto: 'Muerto',
  robado: 'Robado',
}

const COLOR_ESTADO: Record<string, string> = {
  vendido: 'text-carbon',
  muerto: 'text-alerta',
  robado: 'text-alerta',
}

/**
 * Hallazgo 2.4: lo que sale del lote quedaba invisible en cuanto salía --
 * desaparecía de "Digitar" y de "Salidas" (que solo lista activos) sin dejar
 * ningún rastro visible de qué pasó ni por qué. Vive aquí, no en una
 * pantalla nueva: "Salidas" ya es donde se registra la salida, y es donde
 * el ganadero espera poder mirar hacia atrás "¿qué salió de este lote?" sin
 * ir a buscar animal por animal en sus fichas.
 */
export function SalidasRecientes({ animales }: { animales: AnimalVista[] }) {
  const salidos = animales
    .filter((a) => a.estado !== 'activo')
    .sort((a, b) => (b.fechaSalida ?? '').localeCompare(a.fechaSalida ?? ''))

  if (salidos.length === 0) return null

  return (
    <section className="mt-8 rounded-lg border border-borde bg-papel p-4">
      <h2 className="mb-3 rotulo">Qué salió de este lote</h2>
      <ul className="divide-y divide-tierra/10 text-sm">
        {salidos.map((animal) => (
          <li key={animal.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
            <span>
              <span className="cifra font-medium">{animal.chapeta}</span>
              {' · '}
              <span className={COLOR_ESTADO[animal.estado] ?? ''}>
                {ETIQUETA_ESTADO[animal.estado] ?? animal.estado}
              </span>
              {animal.fechaSalida && (
                <>
                  {' el '}
                  <span className="cifra">{animal.fechaSalida}</span>
                </>
              )}
              {animal.pesoSalidaKg !== null && (
                <>
                  {' · '}
                  <span className="cifra">{formatearKg(animal.pesoSalidaKg)}</span>
                </>
              )}
            </span>
            {animal.motivoSalida && <span className="text-carbon-3">{animal.motivoSalida}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
