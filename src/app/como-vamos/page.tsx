import { hoyBogota } from '@/calc/fechas'
import type { ResumenPromedio } from '@/calc/lote'
import { desempeno, normalizarPeriodo, type FilaDesempeno, type Periodo } from '@/datos/desempeno'
import { leerGdpObjetivo, ParametroFaltanteError } from '@/datos/parametros'
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

// Hoy esta ruta es dinámica solo porque lee `searchParams`: si algún día deja
// de leerlo, Next volvería a prerenderizarla en el build y el rendimiento
// (que también depende de la fecha de hoy y del estado vivo de la base)
// quedaría congelado. Se declara explícito para que ese accidente no
// dependa de que nadie le quite la lectura de parámetros.
export const dynamic = 'force-dynamic'

export default async function ComoVamos({
  searchParams,
}: {
  // Un tipo aquí es solo una afirmación de compilación: la dirección web
  // puede traer cualquier texto (un enlace viejo, un dedazo), así que se
  // recibe como `string` y se valida con `normalizarPeriodo` antes de usarlo.
  searchParams: Promise<{ periodo?: string }>
}) {
  const hoy = hoyBogota()
  const { periodo: periodoParam } = await searchParams
  const periodo = normalizarPeriodo(periodoParam)

  // El rendimiento (clasificación por umbral, y con ella el resto de la
  // fila) no puede calcularse sin los parámetros de umbral configurados:
  // `desempeno` lanza a propósito en vez de inventarlos. En una finca recién
  // creada eso es esperable, y las cuatro tarjetas de la portada enlazan
  // justo aquí — este primer día no puede tumbar toda la pantalla. Se
  // atrapa igual que en la portada, se conserva lo que sí puede mostrarse
  // sin umbrales (el objetivo configurado, si lo hay), y se avisa con
  // claridad qué falta. Cualquier otro error se deja propagar hacia
  // `error.tsx`, que es donde le corresponde a un fallo inesperado.
  let filas: FilaDesempeno[] = []
  let resumen: ResumenPromedio = { promedio: null, n: 0, total: 0, cobertura: 0 }
  let errorParametros: string | null = null
  try {
    ;({ filas, resumen } = await desempeno(periodo, hoy))
  } catch (error) {
    if (!(error instanceof ParametroFaltanteError)) throw error
    errorParametros = error.message
  }

  const objetivo = await leerGdpObjetivo(hoy)

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

      {errorParametros && (
        <p className="mb-4 rounded border border-ambar bg-ambar/10 p-3 text-sm text-ambar">
          {errorParametros} Mientras tanto no se puede calcular la ganancia diaria promedio ni
          clasificar el rendimiento por debajo del umbral.
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Cifra
          etiqueta="Ganancia diaria promedio"
          valor={formatearGdp(resumen.promedio)}
          comparacion={`basado en ${resumen.n} de ${resumen.total} animales`}
        />
        <Cifra etiqueta="Objetivo" valor={objetivo === null ? SIN_DATO : formatearGdp(objetivo)} />
        <Cifra
          etiqueta="Contra el objetivo"
          valor={
            resumen.promedio === null || objetivo === null
              ? SIN_DATO
              : formatearGdp(resumen.promedio - objetivo)
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
          {errorParametros && ordenadas.length === 0 && (
            <tr>
              <td colSpan={9} className="p-2 text-center text-carbon/60">
                Configura los umbrales de rendimiento para ver la tabla por animal.
              </td>
            </tr>
          )}
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
