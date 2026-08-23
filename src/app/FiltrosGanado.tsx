'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type Chip = { clave: string; texto: string; cuenta: number }

export type LoteElegible = { id: string; nombre: string; animales: number }

const PERIODOS = [
  { valor: 'ultimo_pesaje', texto: 'El último pesaje' },
  { valor: 'dias_30', texto: 'Los últimos 30 días' },
  { valor: 'dias_60', texto: 'Los últimos 60 días' },
  { valor: 'dias_90', texto: 'Los últimos 90 días' },
  { valor: 'acumulado', texto: 'Desde que entraron' },
] as const

const ORDENES = [
  { valor: 'peor', texto: 'Peor primero' },
  { valor: 'mejor', texto: 'Mejor primero' },
  { valor: 'chapeta', texto: 'Por chapeta' },
] as const

const CAJA =
  'inline-flex items-center gap-2 rounded border border-borde bg-white px-3 py-2 text-[13.5px] text-carbon'

/**
 * Los filtros escriben en la dirección web, no en estado de React.
 *
 * Así el dueño puede guardar "Ceba 01, peor primero" en el navegador y volver
 * ahí mañana, la lista sigue armándose en el servidor -- sin traerse los 56
 * animales al navegador para filtrarlos allá -- y el botón Atrás funciona.
 */
export function FiltrosGanado({ lotes, chips }: { lotes: LoteElegible[]; chips: Chip[] }) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  // Un solo lugar donde se escribe la dirección: cambiar un filtro conserva
  // los demás. Sin esto, elegir un lote borraría el orden y la búsqueda.
  function poner(clave: string, valor: string | null) {
    const siguientes = new URLSearchParams(params.toString())
    if (valor === null || valor === '') siguientes.delete(clave)
    else siguientes.set(clave, valor)
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-[9px]">
      <label className={CAJA}>
        <span className="text-[12px] font-semibold text-carbon-3">Lote</span>
        <select
          aria-label="Lote"
          className="bg-transparent outline-none"
          value={params.get('lote') ?? lotes[0]?.id ?? ''}
          onChange={(evento) => poner('lote', evento.target.value)}
        >
          {lotes.map((lote) => (
            <option key={lote.id} value={lote.id}>
              {lote.nombre} · {lote.animales} animales
            </option>
          ))}
        </select>
      </label>

      <label className={CAJA}>
        <span className="text-[12px] font-semibold text-carbon-3">Desde</span>
        <select
          aria-label="Desde"
          className="bg-transparent outline-none"
          value={params.get('desde') ?? 'ultimo_pesaje'}
          onChange={(evento) => poner('desde', evento.target.value)}
        >
          {PERIODOS.map((periodo) => (
            <option key={periodo.valor} value={periodo.valor}>
              {periodo.texto}
            </option>
          ))}
        </select>
      </label>

      <label className={CAJA}>
        <span className="text-[12px] font-semibold text-carbon-3">Orden</span>
        <select
          aria-label="Orden"
          className="bg-transparent outline-none"
          value={params.get('orden') ?? 'peor'}
          onChange={(evento) => poner('orden', evento.target.value)}
        >
          {ORDENES.map((orden) => (
            <option key={orden.valor} value={orden.valor}>
              {orden.texto}
            </option>
          ))}
        </select>
      </label>

      <label className={CAJA}>
        <span aria-hidden>🔍</span>
        <input
          placeholder="Buscar chapeta"
          aria-label="Buscar chapeta"
          className="w-[118px] bg-transparent outline-none"
          defaultValue={params.get('q') ?? ''}
          onChange={(evento) => poner('q', evento.target.value)}
        />
      </label>

      <span className="flex-1" />

      {chips.map((chip) => {
        const activo = (params.get('filtro') ?? 'todos') === chip.clave
        return (
          <button
            key={chip.clave}
            type="button"
            onClick={() => poner('filtro', chip.clave === 'todos' ? null : chip.clave)}
            className={`rounded-full border px-[13px] py-[7px] text-[12.5px] ${
              activo
                ? 'border-monte bg-monte font-semibold text-crema'
                : 'border-borde bg-white text-carbon-2'
            }`}
          >
            {chip.texto} {chip.cuenta}
          </button>
        )
      })}

      <div className="flex gap-[2px] rounded bg-crema-2 p-[3px]">
        {(['rejilla', 'tabla'] as const).map((vista) => {
          const activo = (params.get('vista') ?? 'rejilla') === vista
          return (
            <button
              key={vista}
              type="button"
              onClick={() => poner('vista', vista === 'rejilla' ? null : vista)}
              className={`rounded-[2px] px-3 py-[6px] text-[12.5px] font-semibold ${
                activo ? 'bg-white text-carbon shadow-sm' : 'text-carbon-2'
              }`}
            >
              {vista === 'rejilla' ? 'Rejilla' : 'Tabla'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
