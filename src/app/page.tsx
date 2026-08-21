import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { kgProducidos, type AnimalProduccion } from '@/calc/produccion'
import { prisma } from '@/datos/cliente'
import { aKg } from '@/datos/conversion'
import { desempeno, type FilaDesempeno } from '@/datos/desempeno'
import { frescura } from '@/datos/frescura'
import { ParametroFaltanteError } from '@/datos/parametros'
import { pesoVivoPorLote, ultimoPesoPorAnimal } from '@/datos/pesajes'
import { eventosVencidos } from '@/datos/sanidad'
import { Cifra } from '@/ui/Cifra'
import { formatearGdp, formatearKg } from '@/ui/formato'
import type { ResumenPromedio } from '@/calc/lote'

export default async function Hoy() {
  const hoy = hoyBogota()
  const estado = await frescura(hoy)

  // El desempeño (gdp, clasificación por umbral) no puede calcularse sin los
  // parámetros de umbral configurados: leerUmbrales lanza a propósito en vez
  // de inventarlos, porque un umbral inventado clasificaría animales con un
  // criterio que nadie decidió. En una finca recién creada eso es esperable
  // (todavía nadie configuró nada) y no puede tumbar toda la portada: se
  // atrapa aquí, se conserva todo lo que sí puede mostrarse sin umbrales, y se
  // avisa con claridad qué falta configurar. Cualquier otro error se deja
  // propagar — no es este el lugar para esconder un bug real.
  let filas: FilaDesempeno[] = []
  let resumen: ResumenPromedio = { promedio: null, n: 0, total: 0, cobertura: 0 }
  let errorParametros: string | null = null
  try {
    ;({ filas, resumen } = await desempeno('ultimo_pesaje', hoy))
  } catch (error) {
    if (!(error instanceof ParametroFaltanteError)) throw error
    errorParametros = error.message
  }

  const pesos = await pesoVivoPorLote()
  const ultimos = await ultimoPesoPorAnimal()
  const vencidos = await eventosVencidos(hoy)

  const animales = await prisma.animal.findMany({
    where: { lote: { tipo: 'ceba' } },
    select: { id: true, estado: true, pesoEntradaKg: true },
  })
  const paraProduccion: AnimalProduccion[] = animales.map((animal) => ({
    estado: animal.estado,
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    pesoUltimoKg: ultimos.get(animal.id)?.pesoKg ?? null,
  }))
  // Cuántos animales de ceba están vivos no depende de los umbrales: se cuenta
  // aparte para que esa cifra siga disponible aunque falte el parámetro.
  const animalesVivos = animales.filter((a) => a.estado === 'activo').length

  const pesoVivoTotal = [...pesos.values()].reduce((a, b) => a + b, 0)
  const bajoRendimiento = filas.filter(
    (f) => f.clasificacion === 'bajo' || f.clasificacion === 'critico',
  )

  return (
    <main className="p-6">
      <p
        className={
          estado.alarmante
            ? 'mb-6 text-2xl font-semibold text-ambar'
            : 'mb-6 text-sm text-carbon/60'
        }
      >
        {estado.diasSinDatos === null
          ? 'Todavía no hay ningún pesaje registrado.'
          : `Últimos datos hace ${estado.diasSinDatos} días (${estado.ultimaFecha}).`}
      </p>

      <h2 className="mb-3 font-serif text-2xl text-pasto">Engorde</h2>
      {errorParametros && (
        <p className="mb-4 rounded border border-ambar bg-ambar/10 p-3 text-sm text-ambar">
          {errorParametros} Mientras tanto no se puede calcular la ganancia diaria promedio ni
          clasificar el rendimiento por debajo del umbral; el resto de la información sigue
          disponible.
        </p>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Animales vivos" valor={String(animalesVivos)} />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Peso vivo total" valor={formatearKg(pesoVivoTotal)} />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra
            etiqueta="Ganancia diaria promedio"
            valor={formatearGdp(resumen.promedio)}
            comparacion={errorParametros ? undefined : `basado en ${resumen.n} de ${resumen.total} animales`}
          />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Kilos producidos" valor={formatearKg(kgProducidos(paraProduccion))} />
        </Link>
      </div>

      <h2 className="mb-3 font-serif text-2xl text-pasto">Atender</h2>
      <ul className="mb-8 space-y-2 text-sm">
        {errorParametros && (
          <li className="text-ambar">
            Clasificación de rendimiento no disponible: faltan parámetros por configurar.
          </li>
        )}
        {bajoRendimiento.length > 0 && (
          <li>
            <a href="/como-vamos" className="text-rojo-tierra underline">
              {bajoRendimiento.length} animal(es) por debajo del umbral de rendimiento
            </a>
          </li>
        )}
        {vencidos.length > 0 && (
          <li className="text-ambar">{vencidos.length} evento(s) sanitario(s) con fecha cumplida</li>
        )}
        {!errorParametros && bajoRendimiento.length === 0 && vencidos.length === 0 && (
          <li className="text-carbon/60">Nada pendiente.</li>
        )}
      </ul>

      <p className="border-t border-tierra/20 pt-4 text-xs text-carbon/50">
        SOFÍA — por Sofanor Echeverría.
      </p>
    </main>
  )
}
