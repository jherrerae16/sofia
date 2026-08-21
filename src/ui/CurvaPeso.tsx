import type { Medicion } from '@/calc/gdp'
import { diasEntre } from '@/calc/fechas'

export function CurvaPeso({
  entrada,
  historial,
  gdpObjetivo,
}: {
  entrada: Medicion
  historial: Medicion[]
  gdpObjetivo: number
}) {
  const serie = [entrada, ...historial]
  if (serie.length < 2) {
    return <p className="text-sm text-carbon/60">Aún no hay suficientes pesajes para dibujar la curva.</p>
  }

  const ancho = 640
  const alto = 240
  const margen = 32

  const diasTotales = diasEntre(entrada.fecha, serie.at(-1)!.fecha)
  const pesoObjetivoFinal = entrada.pesoKg + (gdpObjetivo * diasTotales) / 1000
  const pesoMax = Math.max(...serie.map((m) => m.pesoKg), pesoObjetivoFinal)
  const pesoMin = Math.min(...serie.map((m) => m.pesoKg), entrada.pesoKg)

  const x = (fecha: string) =>
    margen + (diasEntre(entrada.fecha, fecha) / Math.max(1, diasTotales)) * (ancho - 2 * margen)
  const y = (peso: number) =>
    alto - margen - ((peso - pesoMin) / Math.max(1, pesoMax - pesoMin)) * (alto - 2 * margen)

  const real = serie.map((m) => `${x(m.fecha)},${y(m.pesoKg)}`).join(' ')
  const objetivo = `${x(entrada.fecha)},${y(entrada.pesoKg)} ${x(serie.at(-1)!.fecha)},${y(pesoObjetivoFinal)}`

  return (
    <figure>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label="Curva de peso">
        <polyline points={objetivo} fill="none" stroke="#D98324" strokeWidth="2" strokeDasharray="6 4" />
        <polyline points={real} fill="none" stroke="#1B5E3F" strokeWidth="2.5" />
        {serie.map((m) => (
          <circle key={m.fecha} cx={x(m.fecha)} cy={y(m.pesoKg)} r="3.5" fill="#1B5E3F" />
        ))}
      </svg>
      <figcaption className="text-xs text-carbon/60">
        Línea continua: peso medido. Línea punteada: el objetivo de {gdpObjetivo} g/día.
      </figcaption>
    </figure>
  )
}
