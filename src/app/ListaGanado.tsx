'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FilaDesempeno } from '@/datos/desempeno'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'
import { BarraSeleccion } from './BarraSeleccion'

export type FilaGanado = FilaDesempeno & {
  /** No entró en la última tanda: su ganancia es la de la tanda anterior. */
  sinPesarEnLaUltima: boolean
  /** Pasó el peso de venta configurado. False cuando no hay peso configurado. */
  listo: boolean
}

export type Vista = 'rejilla' | 'tabla'

/** El estado de un animal en una línea: un punto de color y una frase corta. */
function estadoDe(fila: FilaGanado): { color: string; texto: string } {
  if (fila.clasificacion === 'quedado') {
    return { color: 'bg-barro', texto: `${formatearGdp(fila.gdpPeriodo)} · quedado` }
  }
  if (fila.gdpPeriodo === null) {
    return { color: 'bg-carbon-3', texto: 'todavía sin ganancia calculable' }
  }
  if (fila.listo) {
    return { color: 'bg-monte', texto: `${formatearGdp(fila.gdpPeriodo)} · listo` }
  }
  return { color: 'bg-tierra', texto: formatearGdp(fila.gdpPeriodo) }
}

export function ListaGanado({
  filas,
  vista,
  seleccionando,
  loteId,
}: {
  filas: FilaGanado[]
  vista: Vista
  seleccionando: boolean
  loteId: string
}) {
  // Las marcas van en estado de React y no en la dirección web, a diferencia
  // de los filtros: marcar tres animales seguidos son tres clics en un
  // segundo, y cada uno tendría que leer una dirección que la vuelta al
  // servidor todavía no ha actualizado -- sobrevivía solo el último.
  //
  // El MODO selección sí vive en la dirección: se enciende una vez y así
  // aguanta una recarga.
  const [marcados, setMarcados] = useState<string[]>([])

  function alternar(animalId: string) {
    setMarcados((antes) =>
      antes.includes(animalId) ? antes.filter((id) => id !== animalId) : [...antes, animalId],
    )
  }

  if (filas.length === 0) {
    return <p className="text-[14px] text-carbon-2">Ningún animal cumple ese filtro.</p>
  }

  if (vista === 'tabla') {
    return (
      <div className="overflow-x-auto rounded border border-borde">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-borde bg-papel-2">
              {[
                'Chapeta',
                'Peso',
                'Kg ganados',
                'g/día del periodo',
                'g/día acumulada',
                'Días en finca',
              ].map((encabezado) => (
                <th key={encabezado} className="rotulo px-4 py-3 text-left">
                  {encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.animalId} className="border-b border-borde last:border-b-0">
                <td className="px-4 py-[9px]">
                  <Link href={`/animales/${fila.animalId}`} className="chapeta text-[13px]">
                    {fila.chapeta}
                  </Link>
                </td>
                <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearKg(fila.pesoActualKg)}</td>
                <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearKg(fila.kgGanados)}</td>
                <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearGdp(fila.gdpPeriodo)}</td>
                <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearGdp(fila.gdpAcumulada)}</td>
                <td className="cifra px-4 py-[9px] text-[13.5px]">{fila.diasEnFinca}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(212px,1fr))] gap-[9px]">
      {filas.map((fila) => {
        const estado = estadoDe(fila)
        const marcado = marcados.includes(fila.animalId)

        const cuerpo = (
          <>
            <div className="flex items-center gap-2">
              <span className="chapeta text-[13px]">{fila.chapeta}</span>
              {fila.sinPesarEnLaUltima && (
                <span className="rotulo" title="No entró en la última tanda">
                  sin pesar
                </span>
              )}
            </div>
            <div className="mt-[9px] flex items-center gap-[7px] text-[12.5px] text-carbon-2">
              <span aria-hidden className={`h-[6px] w-[6px] flex-none rounded-full ${estado.color}`} />
              <span>{estado.texto}</span>
            </div>
            <div className="cifra mt-[3px] text-[12px] text-carbon-3">
              {fila.pesoActualKg === null ? SIN_DATO : formatearKg(fila.pesoActualKg)}
            </div>
          </>
        )

        const clases = `relative block rounded border bg-papel px-[13px] py-[12px] no-underline ${
          marcado ? 'border-monte ring-1 ring-monte' : 'border-borde'
        }`

        // En modo selección la tarjeta deja de ser un enlace: el clic sirve
        // para marcar. Un enlace que a veces navega y a veces marca es la
        // forma más rápida de que alguien abra una ficha sin querer.
        if (seleccionando) {
          return (
            <button
              key={fila.animalId}
              type="button"
              data-testid="tarja"
              aria-pressed={marcado}
              onClick={() => alternar(fila.animalId)}
              className={`${clases} text-left`}
            >
              <span
                aria-hidden
                className={`absolute right-[11px] top-[11px] h-[15px] w-[15px] rounded-full border ${
                  marcado ? 'border-monte bg-monte' : 'border-borde-2'
                }`}
              />
              {cuerpo}
            </button>
          )
        }

        return (
          <Link
            key={fila.animalId}
            href={`/animales/${fila.animalId}`}
            data-testid="tarja"
            className={clases}
          >
            {cuerpo}
          </Link>
        )
      })}
    </div>
    <BarraSeleccion loteId={loteId} marcados={marcados} alLimpiar={() => setMarcados([])} />
    </>
  )
}
