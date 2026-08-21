import { hoyBogota } from '@/calc/fechas'
import { desempeno, type Periodo } from '@/datos/desempeno'
import { leerParametro } from '@/datos/parametros'
import { Cifra } from '@/ui/Cifra'
import { Semaforo } from '@/ui/Semaforo'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'ultimo_pesaje', texto: 'Desde el último pesaje' },
  { valor: 'dias_30', texto: 'Últimos 30 días' },
  { valor: 'dias_60', texto: 'Últimos 60 días' },
  { valor: 'dias_90', texto: 'Últimos 90 días' },
  { valor: 'acumulado', texto: 'Acumulado desde la entrada' },
]

export default async function ComoVamos({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>
}) {
  const hoy = hoyBogota()
  const { periodo = 'ultimo_pesaje' } = await searchParams
  const { filas, resumen } = await desempeno(periodo, hoy)
  const objetivo = Number((await leerParametro('gdp_objetivo', hoy)) ?? 0)

  const ordenadas = [...filas].sort((a, b) => {
    if (a.gdpPeriodo === null) return 1
    if (b.gdpPeriodo === null) return -1
    return a.gdpPeriodo - b.gdpPeriodo
  })

  return (
    <main className="p-6">
      <h1 className="mb-2 font-serif text-3xl text-pasto">Cómo vamos</h1>

      <nav className="mb-6 flex flex-wrap gap-2">
        {PERIODOS.map((opcion) => (
          <a
            key={opcion.valor}
            href={`/como-vamos?periodo=${opcion.valor}`}
            className={`rounded px-3 py-1 text-sm ${
              opcion.valor === periodo ? 'bg-pasto text-white' : 'bg-pasto-claro text-carbon'
            }`}
          >
            {opcion.texto}
          </a>
        ))}
      </nav>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Cifra
          etiqueta="Ganancia diaria promedio"
          valor={formatearGdp(resumen.promedio)}
          comparacion={`basado en ${resumen.n} de ${resumen.total} animales`}
        />
        <Cifra etiqueta="Objetivo" valor={formatearGdp(objetivo)} />
        <Cifra
          etiqueta="Contra el objetivo"
          valor={
            resumen.promedio === null ? SIN_DATO : formatearGdp(resumen.promedio - objetivo)
          }
        />
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-tierra/30 text-left text-xs uppercase text-carbon/60">
          <tr>
            <th className="p-2">Chapeta</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Peso</th>
            <th className="p-2">Último pesaje</th>
            <th className="p-2">Kg ganados</th>
            <th className="p-2">Ganancia del periodo</th>
            <th className="p-2">Acumulada</th>
            <th className="p-2">Días</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((fila) => (
            <tr key={fila.animalId} className="border-b border-tierra/10">
              <td className="p-2">
                <a href={`/animales/${fila.animalId}`} className="font-medium text-pasto underline">
                  {fila.chapeta}
                </a>
              </td>
              <td className="p-2">{fila.lote}</td>
              <td className="cifra p-2">{formatearKg(fila.pesoActualKg)}</td>
              <td className="cifra p-2">{fila.fechaUltimoPesaje ?? SIN_DATO}</td>
              <td className="cifra p-2">{formatearKg(fila.kgGanados)}</td>
              <td className="cifra p-2">{formatearGdp(fila.gdpPeriodo)}</td>
              <td className="cifra p-2">{formatearGdp(fila.gdpAcumulada)}</td>
              <td className="cifra p-2">{fila.diasEnFinca}</td>
              <td className="p-2">
                <Semaforo clasificacion={fila.clasificacion} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
