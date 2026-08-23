import Link from 'next/link'
import type { FilaDesempeno } from '@/datos/desempeno'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

export type FilaGanado = FilaDesempeno & {
  /** No entró en la última tanda: su ganancia es la de la tanda anterior. */
  sinPesarEnLaUltima: boolean
  /** Pasó el peso de venta configurado. False cuando no hay peso configurado. */
  listo: boolean
}

export type Vista = 'rejilla' | 'tabla'

export function RejillaGanado({ filas, vista }: { filas: FilaGanado[]; vista: Vista }) {
  if (filas.length === 0) {
    return <p className="text-[14px] text-carbon-2">Ningún animal cumple ese filtro.</p>
  }

  if (vista === 'tabla') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-borde">
              {[
                'Chapeta',
                'Peso',
                'Kg ganados',
                'g/día del periodo',
                'g/día acumulada',
                'Días en finca',
              ].map((encabezado) => (
                <th key={encabezado} className="rotulo pb-3 text-left">
                  {encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.animalId} className="border-b border-borde">
                <td className="py-[9px]">
                  <Link href={`/animales/${fila.animalId}`} className="font-extrabold text-carbon">
                    {fila.chapeta}
                  </Link>
                </td>
                <td className="cifra py-[9px]">{formatearKg(fila.pesoActualKg)}</td>
                <td className="cifra py-[9px]">{formatearKg(fila.kgGanados)}</td>
                <td className="cifra py-[9px]">{formatearGdp(fila.gdpPeriodo)}</td>
                <td className="cifra py-[9px]">{formatearGdp(fila.gdpAcumulada)}</td>
                <td className="cifra py-[9px]">{fila.diasEnFinca}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] overflow-hidden rounded border border-b-0 border-l-0 border-borde">
      {filas.map((fila) => {
        const mal = fila.clasificacion === 'bajo' || fila.clasificacion === 'critico'
        const apagado = fila.sinPesarEnLaUltima ? 'opacity-55' : ''
        return (
          <Link
            key={fila.animalId}
            href={`/animales/${fila.animalId}`}
            data-testid="tarja"
            className={`relative block border-l border-t border-borde px-[15px] pb-[13px] pt-[15px] no-underline ${
              fila.sinPesarEnLaUltima ? 'bg-crema-2' : 'bg-white'
            }`}
          >
            <div
              className={`text-[14.5px] font-extrabold tracking-[0.08em] text-carbon-3 ${apagado}`}
            >
              {fila.chapeta}
            </div>
            <div
              className={`cifra mt-[13px] text-[30px] font-extrabold leading-none tracking-[-0.03em] ${
                mal ? 'text-barro' : fila.listo ? 'text-monte' : 'text-carbon'
              } ${apagado}`}
            >
              {fila.gdpPeriodo === null ? SIN_DATO : Math.round(fila.gdpPeriodo)}
            </div>
            <div className="mt-1 text-[11px] text-carbon-3">g/día</div>
            <div
              className={`mt-[11px] text-[12.5px] ${
                fila.sinPesarEnLaUltima ? 'italic text-carbon-3' : 'text-carbon-2'
              }`}
            >
              {fila.sinPesarEnLaUltima
                ? 'no entró en la última tanda'
                : `${formatearKg(fila.pesoActualKg)}${fila.listo ? ' · listo' : ''}`}
            </div>
            {/* Una barra de 3px, no un fondo de color: el color marca el
                estado sin volver la rejilla un semáforo de catorce luces. */}
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 h-[3px] ${
                mal ? 'bg-barro' : fila.listo ? 'bg-monte' : 'bg-borde-2 opacity-45'
              }`}
            />
          </Link>
        )
      })}
    </div>
  )
}
