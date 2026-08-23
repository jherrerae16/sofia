import type { SerieLote } from '@/datos/serie'

const ANCHO = 900
const ALTO = 260
const IZQ = 58
const DER = 880
const ARRIBA = 26
const ABAJO = 214

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function diaYMes(fecha: string): string {
  const [, mes, dia] = fecha.split('-')
  return `${Number(dia)} ${MESES[Number(mes) - 1]}`
}

/**
 * La curva de engorde del lote: el peso promedio medido contra la trayectoria
 * que llevaría al objetivo.
 *
 * El pie no es decoración. Un promedio calculado sobre diez de catorce
 * animales se lee como si fueran los catorce, y ahí es donde el dueño toma
 * una decisión con un número que no dice lo que él cree.
 */
export function GraficaLote({ serie }: { serie: SerieLote }) {
  if (serie.puntos.length < 2) {
    return (
      <figure className="rounded border border-borde bg-white px-6 py-[22px]">
        <figcaption className="text-[12.5px] leading-[1.45] text-carbon-2">
          Con un solo punto todavía no hay curva que dibujar. Anota la próxima tanda de pesos y
          aquí va a aparecer cómo viene engordando el lote.
        </figcaption>
      </figure>
    )
  }

  // La escala sale de los datos, nunca de números fijos: un lote de destete y
  // uno de ceba gorda no caben en la misma regla.
  const valores = serie.puntos
    .flatMap((punto) => [punto.pesoPromedioKg, punto.objetivoKg])
    .filter((valor): valor is number => valor !== null)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const aire = (max - min) * 0.1 || 10
  const piso = min - aire
  const techo = max + aire

  const y = (kg: number) => ABAJO - ((kg - piso) / (techo - piso)) * (ABAJO - ARRIBA)
  const x = (i: number) => IZQ + (i / (serie.puntos.length - 1)) * (DER - IZQ)

  const trazo = (obtener: (punto: SerieLote['puntos'][number]) => number | null) =>
    serie.puntos
      .map((punto, i) => ({ valor: obtener(punto), i }))
      .filter((p): p is { valor: number; i: number } => p.valor !== null)
      .map((p, n) => `${n === 0 ? 'M' : 'L'}${x(p.i)},${y(p.valor)}`)
      .join(' ')

  const ultimo = serie.puntos.at(-1)!
  const hayObjetivo = serie.puntos.some((punto) => punto.objetivoKg !== null)

  return (
    <figure className="overflow-x-auto rounded border border-borde bg-white px-6 pb-[18px] pt-[22px]">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        width="100%"
        height="240"
        role="img"
        aria-label={`Peso promedio del lote en ${serie.puntos.length} puntos`}
      >
        {[0, 1, 2, 3].map((n) => {
          const linea = ARRIBA + ((ABAJO - ARRIBA) / 3) * n
          const kg = techo - ((techo - piso) / 3) * n
          return (
            <g key={n}>
              <line x1={IZQ} y1={linea} x2={DER} y2={linea} stroke="var(--color-borde)" strokeWidth={1} />
              <text
                x={IZQ - 12}
                y={linea + 4}
                textAnchor="end"
                fill="var(--color-carbon-3)"
                fontSize={10.5}
              >
                {Math.round(kg)}
              </text>
            </g>
          )
        })}

        {hayObjetivo && (
          <path
            className="meta"
            d={trazo((punto) => punto.objetivoKg)}
            fill="none"
            stroke="var(--color-carbon-3)"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}

        <path
          d={trazo((punto) => punto.pesoPromedioKg)}
          fill="none"
          stroke="var(--color-tierra)"
          strokeWidth={2}
        />
        {serie.puntos.map((punto, i) => (
          <circle
            key={punto.fecha}
            cx={x(i)}
            cy={y(punto.pesoPromedioKg)}
            r={i === serie.puntos.length - 1 ? 6 : 5}
            fill="var(--color-tierra)"
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {serie.puntos.map((punto, i) => (
          <text
            key={punto.fecha}
            x={x(i)}
            y={246}
            textAnchor="middle"
            fill="var(--color-carbon-3)"
            fontSize={11}
          >
            {diaYMes(punto.fecha)}
          </text>
        ))}
      </svg>

      <figcaption className="mt-[14px] text-[12.5px] leading-[1.45] text-carbon-2">
        Peso promedio de los {serie.animalesDelLote} animales del lote.
        {hayObjetivo && ' La línea punteada es a dónde llegarían con el objetivo que fijaste.'}
        {ultimo.animales > 0 && ultimo.animales < serie.animalesDelLote
          ? ` El último pesaje cubrió ${ultimo.animales} de ${serie.animalesDelLote}: a los demás se les cuenta su peso anterior.`
          : ''}
      </figcaption>
    </figure>
  )
}
