import Link from 'next/link'
import { hoyBogota } from '@/calc/fechas'
import { kgProducidos, type AnimalProduccion } from '@/calc/produccion'
import { prisma } from '@/datos/cliente'
import { aKg } from '@/datos/conversion'
import { desempeno } from '@/datos/desempeno'
import { frescura } from '@/datos/frescura'
import { pesoVivoPorLote, ultimoPesoPorAnimal } from '@/datos/pesajes'
import { eventosVencidos } from '@/datos/sanidad'
import { Cifra } from '@/ui/Cifra'
import { formatearGdp, formatearKg } from '@/ui/formato'

export default async function Hoy() {
  const hoy = hoyBogota()
  const estado = await frescura(hoy)
  const { filas, resumen } = await desempeno('ultimo_pesaje', hoy)
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
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Animales vivos" valor={String(filas.length)} />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Peso vivo total" valor={formatearKg(pesoVivoTotal)} />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra
            etiqueta="Ganancia diaria promedio"
            valor={formatearGdp(resumen.promedio)}
            comparacion={`basado en ${resumen.n} de ${resumen.total} animales`}
          />
        </Link>
        <Link href="/como-vamos" className="block transition hover:opacity-80">
          <Cifra etiqueta="Kilos producidos" valor={formatearKg(kgProducidos(paraProduccion))} />
        </Link>
      </div>

      <h2 className="mb-3 font-serif text-2xl text-pasto">Atender</h2>
      <ul className="mb-8 space-y-2 text-sm">
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
        {bajoRendimiento.length === 0 && vencidos.length === 0 && (
          <li className="text-carbon/60">Nada pendiente.</li>
        )}
      </ul>

      <p className="border-t border-tierra/20 pt-4 text-xs text-carbon/50">
        SOFÍA — por Sofanor Echeverría.
      </p>
    </main>
  )
}
