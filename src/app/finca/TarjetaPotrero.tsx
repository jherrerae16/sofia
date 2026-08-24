import type { PotreroVista } from '@/datos/potreros'
import { formatearHectareas, formatearKg } from '@/ui/formato'

/**
 * Un potrero como tarjeta, no como fila de tabla: lo que el dueño mira aquí
 * no son siete columnas comparables, es "qué hay encima de cada pedazo de
 * tierra y desde cuándo".
 */
export function TarjetaPotrero({ potrero }: { potrero: PotreroVista }) {
  const ocupado = potrero.lotesOcupantes.length > 0
  const sobrecargado = potrero.estadoCapacidad === 'sobrecargado'

  // La barra compara el peso vivo encima contra la capacidad del potrero. Sin
  // capacidad configurada no se dibuja: una barra sin escala no dice nada.
  const llenado =
    potrero.capacidadKg > 0
      ? Math.min(100, Math.round((potrero.pesoVivoKg / potrero.capacidadKg) * 100))
      : null

  return (
    <div
      data-testid="potrero"
      className={`relative overflow-hidden rounded border border-borde p-[18px] ${
        ocupado ? 'bg-papel-2' : 'bg-papel'
      }`}
    >
      <h3 className="text-[17px] font-extrabold leading-none">{potrero.nombre}</h3>
      <div className="mt-[5px] text-[12.5px] text-carbon-3">
        {formatearHectareas(potrero.hectareas)} ha
        {potrero.tipoPasto ? ` · ${potrero.tipoPasto}` : ''}
        {potrero.tieneAgua ? ' · con agua' : ' · sin agua'}
      </div>

      <div
        className={`mt-4 text-[13px] font-semibold ${sobrecargado ? 'text-barro' : 'text-carbon-2'}`}
      >
        {ocupado ? `Ocupado · ${potrero.lotesOcupantes.join(', ')}` : 'Descansando'}
      </div>

      <div className="mt-[5px] text-[13px] text-carbon-3">
        {ocupado
          ? `${potrero.diasOcupacion ?? 0} días · ${formatearKg(potrero.pesoVivoKg)} encima`
          : potrero.diasDescanso === null
            ? 'sin lote desde que se creó'
            : `${potrero.diasDescanso} días desde que salió el lote`}
      </div>

      {llenado !== null && (
        <div className="mt-[15px] h-1 overflow-hidden rounded-sm bg-borde">
          <span
            aria-hidden
            className={`block h-full ${sobrecargado ? 'bg-barro' : 'bg-carbon-3'}`}
            style={{ width: `${llenado}%` }}
          />
        </div>
      )}
    </div>
  )
}
