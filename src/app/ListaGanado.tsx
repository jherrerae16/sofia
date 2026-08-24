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

type Estado = 'quedado' | 'listo' | 'bien' | 'sin_dato'

function estadoDe(fila: FilaGanado): Estado {
  if (fila.clasificacion === 'quedado') return 'quedado'
  if (fila.gdpPeriodo === null) return 'sin_dato'
  return fila.listo ? 'listo' : 'bien'
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
            {filas.map((fila) => {
              const quedado = estadoDe(fila) === 'quedado'
              return (
                <tr
                  key={fila.animalId}
                  data-estado={estadoDe(fila)}
                  className={`border-b border-borde last:border-b-0 ${quedado ? 'bg-alerta-suave' : ''}`}
                >
                  <td className="px-4 py-[9px]">
                    <Link href={`/animales/${fila.animalId}`} className="chapeta text-[13px]">
                      {fila.chapeta}
                    </Link>
                  </td>
                  <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearKg(fila.pesoActualKg)}</td>
                  <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearKg(fila.kgGanados)}</td>
                  <td
                    className={`cifra px-4 py-[9px] text-[13.5px] ${quedado ? 'font-bold text-alerta' : ''}`}
                  >
                    {formatearGdp(fila.gdpPeriodo)}
                  </td>
                  <td className="cifra px-4 py-[9px] text-[13.5px]">{formatearGdp(fila.gdpAcumulada)}</td>
                  <td className="cifra px-4 py-[9px] text-[13.5px]">{fila.diasEnFinca}</td>
                </tr>
              )
            })}
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
          const quedado = estado === 'quedado'
          const marcado = marcados.includes(fila.animalId)

          const cuerpo = (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chapeta text-[13px]">{fila.chapeta}</span>
                {quedado && (
                  // La palabra, no un punto: "Quedado" en rojo se lee de lejos
                  // y no depende de distinguir dos cafés parecidos.
                  <span className="rounded-sm bg-alerta px-[6px] py-[3px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-papel">
                    Quedado
                  </span>
                )}
                {fila.sinPesarEnLaUltima && (
                  <span className="rotulo" title="No entró en la última tanda">
                    sin pesar
                  </span>
                )}
              </div>

              <div
                className={`cifra mt-[10px] text-[22px] font-extrabold leading-none tracking-[-0.02em] ${
                  quedado ? 'text-alerta' : estado === 'listo' ? 'text-monte' : 'text-carbon'
                }`}
              >
                {fila.gdpPeriodo === null ? SIN_DATO : Math.round(fila.gdpPeriodo)}
                <small className="ml-[3px] text-[11px] font-semibold text-carbon-3">g/día</small>
              </div>

              <div className="cifra mt-[6px] text-[12px] text-carbon-3">
                {fila.pesoActualKg === null ? SIN_DATO : formatearKg(fila.pesoActualKg)}
                {estado === 'listo' && <span className="ml-1 font-semibold text-monte">· listo</span>}
              </div>
            </>
          )

          // El borde rojo y el fondo tenue hacen el trabajo desde lejos; la
          // etiqueta lo confirma de cerca. Antes toda la diferencia era un
          // punto de seis píxeles en terracota contra otro en café.
          const clases = `relative block rounded border px-[13px] py-[12px] no-underline ${
            marcado
              ? 'border-monte bg-papel ring-1 ring-monte'
              : quedado
                ? 'border-alerta bg-alerta-suave'
                : 'border-borde bg-papel'
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
                data-estado={estado}
                aria-pressed={marcado}
                onClick={() => alternar(fila.animalId)}
                className={`${clases} text-left`}
              >
                <span
                  aria-hidden
                  className={`absolute right-[11px] top-[11px] h-[15px] w-[15px] rounded-full border ${
                    marcado ? 'border-monte bg-monte' : 'border-borde-2 bg-papel'
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
              data-estado={estado}
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
