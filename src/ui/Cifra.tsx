export function Cifra({
  valor,
  etiqueta,
  comparacion,
  proyectado = false,
}: {
  valor: string
  etiqueta: string
  comparacion?: string
  proyectado?: boolean
}) {
  return (
    <div className="rounded-lg border border-tierra/20 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-carbon/60">{etiqueta}</div>
      <div
        className={`cifra text-3xl font-semibold ${
          proyectado ? 'text-ambar italic' : 'text-pasto'
        }`}
      >
        {valor}
      </div>
      {proyectado && <div className="text-xs text-ambar">proyectado</div>}
      {comparacion && <div className="cifra mt-1 text-xs text-carbon/60">{comparacion}</div>}
    </div>
  )
}
