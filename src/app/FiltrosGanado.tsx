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

const SELECT =
  'appearance-none rounded border border-borde bg-papel py-[6px] pl-[10px] pr-[26px] text-[13px] text-carbon outline-none'

/**
 * Todo lo que filtra la lista, en una sola fila: antes estaba repartido entre
 * tres sitios de la pantalla y había que buscar cada cosa.
 *
 * Los filtros escriben en la dirección web, no en estado de React. Así se
 * puede guardar "Ceba 01, peor primero" en el navegador y volver ahí mañana,
 * la lista se sigue armando en el servidor -- sin traerse los 56 animales al
 * navegador para filtrarlos allá -- y el botón Atrás funciona.
 */
export function FiltrosGanado({ lotes, chips }: { lotes: LoteElegible[]; chips: Chip[] }) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  // Un solo lugar donde se escribe la dirección: cambiar un filtro conserva
  // los demás. Cambiar de lote sí borra la selección -- los animales marcados
  // son de otro lote y no tendría sentido arrastrarlos.
  function poner(clave: string, valor: string | null) {
    const siguientes = new URLSearchParams(params.toString())
    if (valor === null || valor === '') siguientes.delete(clave)
    else siguientes.set(clave, valor)
    if (clave === 'lote') siguientes.delete('sel')
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-borde bg-papel px-3 py-[9px]">
      <select
        aria-label="Lote"
        className={SELECT}
        value={params.get('lote') ?? lotes[0]?.id ?? ''}
        onChange={(evento) => poner('lote', evento.target.value)}
      >
        {lotes.map((lote) => (
          <option key={lote.id} value={lote.id}>
            {lote.nombre} · {lote.animales} animales
          </option>
        ))}
      </select>

      <select
        aria-label="Desde"
        className={SELECT}
        value={params.get('desde') ?? 'ultimo_pesaje'}
        onChange={(evento) => poner('desde', evento.target.value)}
      >
        {PERIODOS.map((periodo) => (
          <option key={periodo.valor} value={periodo.valor}>
            {periodo.texto}
          </option>
        ))}
      </select>

      <select
        aria-label="Orden"
        className={SELECT}
        value={params.get('orden') ?? 'peor'}
        onChange={(evento) => poner('orden', evento.target.value)}
      >
        {ORDENES.map((orden) => (
          <option key={orden.valor} value={orden.valor}>
            {orden.texto}
          </option>
        ))}
      </select>

      <span className="mx-1 h-[20px] w-px bg-borde" aria-hidden />

      {chips.map((chip) => {
        const activo = (params.get('filtro') ?? 'todos') === chip.clave
        return (
          <button
            key={chip.clave}
            type="button"
            onClick={() => poner('filtro', chip.clave === 'todos' ? null : chip.clave)}
            className={`rounded-full border px-[11px] py-[5px] text-[12px] ${
              activo
                ? 'border-monte bg-monte font-semibold text-papel'
                : 'border-borde bg-papel text-carbon-2'
            }`}
          >
            {chip.texto} <span className="cifra">{chip.cuenta}</span>
          </button>
        )
      })}

      <input
        placeholder="Buscar chapeta"
        aria-label="Buscar chapeta"
        className="ml-auto w-[150px] rounded border border-borde bg-papel px-[10px] py-[6px] text-[13px] outline-none"
        defaultValue={params.get('q') ?? ''}
        onChange={(evento) => poner('q', evento.target.value)}
      />

      <div className="flex gap-[2px] rounded bg-papel-2 p-[2px]">
        {(['rejilla', 'tabla'] as const).map((vista) => {
          const activo = (params.get('vista') ?? 'rejilla') === vista
          return (
            <button
              key={vista}
              type="button"
              onClick={() => poner('vista', vista === 'rejilla' ? null : vista)}
              className={`rounded-[3px] px-[10px] py-[5px] text-[12px] font-semibold ${
                activo ? 'bg-papel text-carbon' : 'text-carbon-2'
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

/** Enciende y apaga el modo selección. Vive en el encabezado, con las acciones. */
export function BotonSeleccionar() {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()
  const activo = params.get('sel') !== null

  function alternar() {
    const siguientes = new URLSearchParams(params.toString())
    if (activo) siguientes.delete('sel')
    else siguientes.set('sel', '')
    router.replace(`${ruta}?${siguientes.toString()}`, { scroll: false })
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${
        activo ? 'border-monte bg-monte text-papel' : 'border-borde bg-papel text-carbon'
      }`}
    >
      {activo ? 'Salir de selección' : 'Seleccionar animales'}
    </button>
  )
}
