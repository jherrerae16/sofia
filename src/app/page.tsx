import { hoyBogota } from '@/calc/fechas'
import { promediarGdp } from '@/calc/lote'
import { calcularCarga, diasOcupacion } from '@/calc/potrero'
import { kgProducidos, type AnimalProduccion } from '@/calc/produccion'
import { prisma } from '@/datos/cliente'
import { aKg } from '@/datos/conversion'
import { desempeno, normalizarPeriodo, type FilaDesempeno } from '@/datos/desempeno'
import { listarLotes } from '@/datos/lotes'
import { listarSuministrosVigentes } from '@/datos/novedades'
import {
  CLAVE_HECTAREAS_UTILES,
  leerGdpObjetivo,
  leerParametro,
  ParametroFaltanteError,
} from '@/datos/parametros'
import { pesoVivoPorLote, ultimaTandaDeLote } from '@/datos/pesajes'
import { listarPotreros } from '@/datos/potreros'
import { eventosVencidos } from '@/datos/sanidad'
import { Cinta, type Celda } from '@/ui/Cinta'
import { ETIQUETA_TIPO_EVENTO } from '@/ui/etiquetas'
import { capitalizar, formatearGdp, formatearKg, separarUnidad, SIN_DATO } from '@/ui/formato'
import { Marco } from '@/ui/Marco'
import { Titular, type Aviso } from '@/ui/Titular'
import { diasEntre } from '@/calc/fechas'

// Todo lo que se ve aquí cambia con el día y con lo que se digitó hace un
// minuto. Sin esto Next prerenderiza la ruta en el momento de construir --
// no lee ninguna API dinámica por sí sola -- y "pesaste hace N días" se
// congela para siempre.
export const dynamic = 'force-dynamic'

export default async function Ganado({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const hoy = hoyBogota()

  const lotes = (await listarLotes()).filter((lote) => lote.tipo === 'ceba')
  const lote = lotes.find((l) => l.id === params.lote) ?? lotes[0]

  if (!lote) {
    return (
      <Marco>
        <Titular>
          <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
            Todavía no hay ningún lote de ceba.
          </h1>
          <p className="mt-[14px] text-[15.5px] text-carbon-2">
            Ábrelo desde Anotar y aquí vas a ver cómo viene engordando.
          </p>
        </Titular>
        <Pie />
      </Marco>
    )
  }

  // Los umbrales son lo único que puede faltar y tumbar la clasificación
  // entera. `leerUmbrales` lanza a propósito en vez de inventarlos, porque un
  // umbral inventado clasificaría animales con un criterio que nadie decidió.
  // En una finca recién creada eso es esperable, y no puede dejar la portada
  // en blanco: se atrapa aquí y se conserva todo lo que sí puede mostrarse.
  let filas: FilaDesempeno[] = []
  let faltanUmbrales: string | null = null
  try {
    filas = (await desempeno(normalizarPeriodo(params.desde), hoy)).filas
  } catch (error) {
    if (!(error instanceof ParametroFaltanteError)) throw error
    faltanUmbrales = error.message
  }

  const delLote = filas.filter((fila) => fila.lote === lote.nombre)
  const resumen = promediarGdp(
    delLote.map((fila) => fila.gdpPeriodo),
    delLote.length,
  )
  const quedados = delLote.filter(
    (fila) => fila.clasificacion === 'bajo' || fila.clasificacion === 'critico',
  )

  const animales = await prisma.animal.findMany({
    where: { loteId: lote.id },
    select: { id: true, chapeta: true, estado: true, pesoEntradaKg: true, pesoSalidaKg: true },
  })
  const activos = animales.filter((animal) => animal.estado === 'activo')

  // --- Las tres frases de la bajada. Cada una se escribe solo si tiene con
  // qué: una frase a medias ("el objetivo son —") es peor que no decir nada.
  const potreros = await listarPotreros(hoy)
  const potrero = potreros.find((p) => p.lotesOcupantes.includes(lote.nombre)) ?? null
  const ultimaTanda = await ultimaTandaDeLote(lote.id)
  const gdpObjetivo = await leerGdpObjetivo(hoy)

  const frases: string[] = []
  if (potrero) {
    const dias = potrero.diasOcupacion
    frases.push(
      dias === null
        ? `${activos.length} en ${potrero.nombre}.`
        : `${activos.length} en ${potrero.nombre}, ${dias} días en ese potrero.`,
    )
  }
  frases.push(
    ultimaTanda === null
      ? 'Todavía no has pesado a este lote.'
      : `Pesaste hace ${diasEntre(ultimaTanda, hoy)} días.`,
  )
  if (gdpObjetivo !== null) frases.push(`El objetivo son ${formatearGdp(gdpObjetivo)}.`)

  // --- Los avisos.
  const chapetasDelLote = new Set(animales.map((animal) => animal.chapeta))
  const vencidos = (await eventosVencidos(hoy)).filter(
    (evento) => evento.lote === lote.nombre || chapetasDelLote.has(evento.chapeta),
  )
  // Una fila por animal se vuelve una sola línea: catorce avisos idénticos no
  // son catorce cosas que atender, son una.
  const porTanda = new Map<string, { texto: string; cuantos: number }>()
  for (const evento of vencidos) {
    const clave = `${evento.tipo}|${evento.producto}|${evento.proximaFecha}`
    const ya = porTanda.get(clave)
    if (ya) {
      ya.cuantos += 1
      continue
    }
    const dias = evento.proximaFecha === null ? 0 : diasEntre(evento.proximaFecha, hoy)
    porTanda.set(clave, {
      texto: `${capitalizar(ETIQUETA_TIPO_EVENTO[evento.tipo])} con ${evento.producto} vencida hace ${dias} días`,
      cuantos: 1,
    })
  }

  const avisos: Aviso[] = [...porTanda.values()].map((tanda) => ({
    texto: `${tanda.texto} — ${tanda.cuantos === 1 ? 'un animal' : `${tanda.cuantos} animales`}.`,
    enlace: { href: '/anotar/sanidad', texto: 'Anotarla' },
    grave: true,
  }))

  for (const suministro of await listarSuministrosVigentes(lote.id)) {
    avisos.push({
      texto: `Les están dando ${suministro.descripcion} desde el ${suministro.fecha}.`,
      enlace: { href: '/anotar/novedad', texto: 'Ver todo lo que reciben' },
    })
  }

  // --- La cinta.
  const pesoVivo = (await pesoVivoPorLote('ceba')).get(lote.id) ?? 0
  const ultimoPorAnimal = new Map(delLote.map((fila) => [fila.animalId, fila.pesoActualKg]))
  const paraProduccion: AnimalProduccion[] = animales.map((animal) => ({
    estado: animal.estado,
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    // El peso de venta, cuando se registró, es el último peso real del animal
    // -- más reciente que el último pesaje de rutina, que pudo haber sido
    // semanas antes de la feria.
    pesoUltimoKg: animal.pesoSalidaKg
      ? aKg(animal.pesoSalidaKg)
      : (ultimoPorAnimal.get(animal.id) ?? null),
  }))

  const hectareasTexto = await leerParametro(CLAVE_HECTAREAS_UTILES, hoy)
  const hectareas = hectareasTexto === null ? null : Number(hectareasTexto)
  const carga =
    hectareas !== null && Number.isFinite(hectareas)
      ? calcularCarga(pesoVivo, activos.length, hectareas)
      : null

  const celdas: Celda[] = [
    { rotulo: 'Novillos', valor: String(activos.length) },
    { rotulo: 'Peso vivo', ...separarUnidad(formatearKg(pesoVivo)) },
    { rotulo: 'Producido en el ciclo', ...separarUnidad(formatearKg(kgProducidos(paraProduccion))) },
    carga
      ? { rotulo: 'Carga', valor: String(carga.kgPorHa), unidad: 'kg/ha' }
      : { rotulo: 'Carga', valor: SIN_DATO },
  ]

  return (
    <Marco>
      <Titular avisos={avisos}>
        <h1 className="text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
          {lote.nombre} va en{' '}
          <b className="font-extrabold text-tierra">{formatearGdp(resumen.promedio)}</b>.{' '}
          {quedados.length > 0 && (
            <u className="font-extrabold text-barro no-underline">
              {quedados.length === 1
                ? 'Un novillo está quedado.'
                : `${quedados.length} novillos están quedados.`}
            </u>
          )}
        </h1>
        <p data-testid="bajada" className="mt-[14px] max-w-[580px] text-[15.5px] text-carbon-2">
          {frases.join(' ')}
        </p>
      </Titular>

      {faltanUmbrales && (
        <p
          role="alert"
          data-testid="falta-configurar"
          className="mt-6 rounded border border-barro/40 bg-white px-4 py-3 text-[14px] text-barro"
        >
          {faltanUmbrales} Mientras tanto no se puede decir quién va quedado, pero el resto de la
          pantalla sigue en pie.
        </p>
      )}

      <Cinta celdas={celdas} />

      <Pie />
    </Marco>
  )
}

/**
 * El nombre completo va aquí y en ninguna otra pantalla. Repetido en los tres
 * destinos deja de ser una dedicatoria y se vuelve decoración.
 */
function Pie() {
  return (
    <footer className="mt-18 border-t border-borde pt-[18px] text-[12px] text-carbon-3">
      SOFÍA — por Sofanor Echeverría.
    </footer>
  )
}
