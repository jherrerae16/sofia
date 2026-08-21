import { hoyBogota } from '@/calc/fechas'
import { gdpAcumulada } from '@/calc/gdp'
import { prisma } from '@/datos/cliente'
import { aFechaISO, aKg } from '@/datos/conversion'
import { leerParametro } from '@/datos/parametros'
import { historialDeAnimal } from '@/datos/pesajes'
import { eventosDeAnimal } from '@/datos/sanidad'
import { Cifra } from '@/ui/Cifra'
import { CurvaPeso } from '@/ui/CurvaPeso'
import { formatearGdp, formatearKg, SIN_DATO } from '@/ui/formato'

export default async function FichaAnimal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hoy = hoyBogota()

  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id },
    include: { lote: { select: { nombre: true } } },
  })
  const entrada = { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) }
  const historial = await historialDeAnimal(id)
  const eventos = await eventosDeAnimal(id)
  const ultimo = historial.at(-1) ?? null
  const gdpObjetivo = Number((await leerParametro('gdp_objetivo', hoy)) ?? 0)

  return (
    <main className="p-6">
      <h1 className="font-serif text-3xl text-pasto">Chapeta {animal.chapeta}</h1>
      <p className="mb-6 text-sm text-carbon/70">
        {animal.lote.nombre} · {animal.raza ?? 'raza sin registrar'} · entró el {entrada.fecha} con{' '}
        {formatearKg(entrada.pesoKg)}
        {animal.proveedor ? ` · ${animal.proveedor}` : ''}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Cifra etiqueta="Peso actual" valor={formatearKg(ultimo?.pesoKg ?? null)} comparacion={ultimo ? `medido el ${ultimo.fecha}` : undefined} />
        <Cifra etiqueta="Kilos ganados" valor={ultimo ? formatearKg(ultimo.pesoKg - entrada.pesoKg) : SIN_DATO} />
        <Cifra etiqueta="Ganancia acumulada" valor={formatearGdp(ultimo ? gdpAcumulada(entrada, ultimo) : null)} />
      </div>

      <section className="mb-8 rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Peso en el tiempo</h2>
        <CurvaPeso entrada={entrada} historial={historial} gdpObjetivo={gdpObjetivo} />
      </section>

      <section className="rounded-lg border border-tierra/20 bg-white p-4">
        <h2 className="mb-3 font-serif text-xl text-pasto">Sanidad</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-carbon/60">Sin eventos registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {eventos.map((evento) => (
              <li key={evento.id} className="border-b border-tierra/10 pb-2">
                <span className="cifra">{evento.fecha}</span> · {evento.tipo} · {evento.producto}
                {evento.dosis ? ` (${evento.dosis})` : ''} · {evento.responsable}
                {evento.proximaFecha && (
                  <span className="ml-2 text-ambar">próxima: {evento.proximaFecha}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
