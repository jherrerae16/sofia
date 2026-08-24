import Link from 'next/link'
import { clasificar } from '@/calc/clasificacion'
import { diasEntre, hoyBogota } from '@/calc/fechas'
import { gdpAcumulada } from '@/calc/gdp'
import { prisma } from '@/datos/cliente'
import { aFechaISO, aKg } from '@/datos/conversion'
import { lineaDeTiempoDeAnimal } from '@/datos/linea-de-tiempo'
import { leerUmbrales, ParametroFaltanteError } from '@/datos/parametros'
import { historialDeAnimal } from '@/datos/pesajes'
import { serieDeAnimal } from '@/datos/serie'
import { Cinta, type Celda } from '@/ui/Cinta'
import { ETIQUETA_ESTADO_ANIMAL } from '@/ui/etiquetas'
import { formatearGdp, formatearKg, separarUnidad } from '@/ui/formato'
import { Marco } from '@/ui/Marco'
import { GraficaLote } from '../../GraficaLote'

// La ficha cambia con cada pesaje y con cada aplicación sanitaria: sin esto
// Next la prerenderiza en el build y la historia queda congelada.
export const dynamic = 'force-dynamic'

export default async function FichaAnimal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hoy = hoyBogota()

  const animal = await prisma.animal.findUniqueOrThrow({
    where: { id },
    include: { lote: { select: { nombre: true } } },
  })
  const entrada = { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) }
  const historial = await historialDeAnimal(id)
  const ultimo = historial.at(-1) ?? null
  const gdp = ultimo ? gdpAcumulada(entrada, ultimo) : null

  // Sin umbrales configurados no se puede decir que un animal va quedado --
  // sería un criterio que nadie decidió. La ficha sigue en pie sin el sello.
  let quedado = false
  try {
    const umbrales = await leerUmbrales(hoy)
    quedado = ['bajo', 'critico'].includes(clasificar(gdp, umbrales))
  } catch (error) {
    if (!(error instanceof ParametroFaltanteError)) throw error
  }

  const pesoActual = animal.pesoSalidaKg ? aKg(animal.pesoSalidaKg) : (ultimo?.pesoKg ?? null)
  const celdas: Celda[] = [
    { rotulo: 'Peso actual', ...separarUnidad(formatearKg(pesoActual)) },
    {
      rotulo: 'Ha ganado',
      ...separarUnidad(formatearKg(pesoActual === null ? null : pesoActual - entrada.pesoKg)),
    },
    { rotulo: 'Ganancia diaria', ...separarUnidad(formatearGdp(gdp)) },
    {
      rotulo: 'Días en finca',
      valor: String(
        diasEntre(entrada.fecha, animal.fechaSalida ? aFechaISO(animal.fechaSalida) : hoy),
      ),
    },
  ]

  const sucesos = await lineaDeTiempoDeAnimal(id, hoy)

  const identidad = [
    animal.lote.nombre,
    animal.raza ?? 'raza sin registrar',
    animal.sexo,
    `entró el ${entrada.fecha} con ${formatearKg(entrada.pesoKg)}`,
    animal.proveedor,
    animal.edadEntradaMeses !== null ? `${animal.edadEntradaMeses} meses al entrar` : null,
  ].filter(Boolean)

  return (
    <Marco>
      <Link
        href="/"
        className="mt-8 inline-block text-[13px] text-carbon-3 underline underline-offset-[3px]"
      >
        ← El ganado
      </Link>

      <div className="max-w-[820px] pt-6">
        <h1 className="text-[clamp(32px,5vw,48px)] font-extrabold leading-none tracking-[0.04em] text-monte">
          {animal.chapeta}
        </h1>
        <div data-testid="identidad" className="mt-[14px] text-[14px] leading-[1.6] text-carbon-2">
          {identidad.join(' · ')}
        </div>

        {/* El estado de salida se dice una vez aquí, como sello, y el motivo
            vive en la línea de tiempo: es un hecho con fecha, no una etiqueta
            del animal. Repetirlo en los dos lados le hace creer al que lee
            que son dos cosas distintas. */}
        {animal.estado !== 'activo' && (
          <p
            data-testid="estado"
            className={`mt-4 inline-block rounded border px-3 py-1 text-[12.5px] font-semibold ${
              animal.estado === 'vendido'
                ? 'border-borde-2 text-carbon-2'
                : 'border-barro/40 text-barro'
            }`}
          >
            {ETIQUETA_ESTADO_ANIMAL[animal.estado]}
            {animal.fechaSalida && <span className="cifra"> el {aFechaISO(animal.fechaSalida)}</span>}
          </p>
        )}

        {quedado && animal.estado === 'activo' && (
          <p
            data-testid="sello"
            className="mt-4 inline-block rounded border border-barro/40 px-3 py-1 text-[12.5px] font-semibold text-barro"
          >
            No está engordando
          </p>
        )}
      </div>

      <Cinta celdas={celdas} />

      <h2 className="rotulo mb-4 mt-13">Su peso contra el objetivo</h2>
      <GraficaLote serie={await serieDeAnimal(id, hoy)} />

      <h2 className="rotulo mb-4 mt-13">Todo lo que le ha pasado</h2>
      <div className="border-t border-borde">
        {sucesos.map((suceso, i) => (
          <div
            key={`${suceso.fecha}-${suceso.clase}-${i}`}
            data-testid="suceso"
            className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-borde py-[13px]"
          >
            <div className="cifra w-[70px] flex-none text-[12.5px] text-carbon-3">
              {suceso.fecha}
            </div>
            <div className="flex-1 basis-[240px]">
              <div className={`text-[14px] ${suceso.malo ? 'text-barro' : 'text-carbon'}`}>
                {suceso.que}
              </div>
              {suceso.detalle && (
                <div className="mt-[3px] text-[12.5px] text-carbon-3">{suceso.detalle}</div>
              )}
            </div>
            <div className="text-right">
              {suceso.cifra && (
                <div className={`cifra text-[14px] font-semibold ${suceso.malo ? 'text-barro' : ''}`}>
                  {suceso.cifra}
                </div>
              )}
              {suceso.cifraChica && (
                <div className="cifra text-[12.5px] text-carbon-3">{suceso.cifraChica}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-[10px]">
        <Link
          href="/anotar/pesos"
          className="rounded bg-monte px-5 py-3 text-[14px] font-semibold text-papel no-underline"
        >
          Anotar su peso
        </Link>
        <Link
          href="/anotar/salida"
          className="rounded border border-borde-2 bg-papel px-5 py-3 text-[14px] font-semibold text-carbon no-underline"
        >
          Registrar su salida
        </Link>
      </div>
    </Marco>
  )
}
