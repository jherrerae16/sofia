import { diasEntre, hoyBogota } from '@/calc/fechas'
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
  CLAVE_PESO_VENTA,
  leerGdpObjetivo,
  leerParametro,
} from '@/datos/parametros'
import { animalesDeLaUltimaTanda, pesoVivoPorLote, ultimaTandaDeLote } from '@/datos/pesajes'
import { listarPotreros } from '@/datos/potreros'
import { eventosVencidos } from '@/datos/sanidad'
import { serieDePesoPromedio } from '@/datos/serie'
import { BotonSeleccionar, FiltrosGanado, type Chip } from './FiltrosGanado'
import { GraficaLote } from './GraficaLote'
import { ListaGanado, type FilaGanado, type Vista } from './ListaGanado'
import { Cinta, type Celda } from '@/ui/Cinta'
import { ETIQUETA_TIPO_EVENTO } from '@/ui/etiquetas'
import { capitalizar, formatearGdp, formatearKg, separarUnidad, SIN_DATO } from '@/ui/formato'
import { EncabezadoPagina } from '@/ui/EncabezadoPagina'
import { Marco } from '@/ui/Marco'
import Link from 'next/link'
import { type Aviso } from '@/ui/Titular'

/** Quedado es ir por debajo de la meta que fijó el dueño, no de un número de aquí. */
function esQuedado(fila: FilaDesempeno): boolean {
  return fila.clasificacion === 'quedado'
}

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
        <EncabezadoPagina
          titulo="Todavía no hay ningún lote de ceba."
          bajada="Ábrelo en «Entrada de ganado» y aquí vas a ver cómo viene engordando."
          acciones={
            <Link
              href="/anotar/entrada"
              className="rounded-full bg-monte px-4 py-2 text-[13px] font-semibold text-papel no-underline"
            >
              Abrir un lote
            </Link>
          }
        />
        <Pie />
      </Marco>
    )
  }

  // Sin meta de ganancia fijada nadie sale marcado como quedado: `clasificar`
  // devuelve 'sin_dato' y la lista se ordena igual. No hace falta atrapar
  // nada -- leer la meta ya no lanza.
  const { filas } = await desempeno(normalizarPeriodo(params.desde), hoy)

  const delLote = filas.filter((fila) => fila.lote === lote.nombre)
  const resumen = promediarGdp(
    delLote.map((fila) => fila.gdpPeriodo),
    delLote.length,
  )
  const quedados = delLote.filter(esQuedado)

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

  // --- La lista. Los chips y el orden salen de los mismos datos que la
  // rejilla, así que la cuenta del chip y lo que aparece al pulsarlo no
  // pueden separarse.
  const pesadosEnLaUltima = await animalesDeLaUltimaTanda(lote.id)
  const pesoVentaTexto = await leerParametro(CLAVE_PESO_VENTA, hoy)
  const pesoVenta = pesoVentaTexto === null ? null : Number(pesoVentaTexto)

  const conEstado: FilaGanado[] = delLote.map((fila) => ({
    ...fila,
    sinPesarEnLaUltima: !pesadosEnLaUltima.has(fila.animalId),
    listo:
      pesoVenta !== null &&
      Number.isFinite(pesoVenta) &&
      fila.pesoActualKg !== null &&
      fila.pesoActualKg >= pesoVenta,
  }))

  const salidos = animales.filter((animal) => animal.estado !== 'activo')
  const chips: Chip[] = [
    { clave: 'todos', texto: 'Todos', cuenta: conEstado.length },
    {
      clave: 'quedados',
      texto: 'Quedados',
      cuenta: conEstado.filter((fila) => esQuedado(fila)).length,
    },
    {
      clave: 'sin_pesar',
      texto: 'Sin pesar',
      cuenta: conEstado.filter((fila) => fila.sinPesarEnLaUltima).length,
    },
  ]
  // El chip de listos solo existe si hay un peso de venta configurado: sin
  // ese criterio, "listo" sería una opinión de la plataforma.
  if (pesoVenta !== null && Number.isFinite(pesoVenta)) {
    chips.push({
      clave: 'listos',
      texto: 'Listos',
      cuenta: conEstado.filter((fila) => fila.listo).length,
    })
  }
  if (salidos.length > 0) {
    chips.push({ clave: 'salieron', texto: 'Ya salieron', cuenta: salidos.length })
  }

  const filtro = params.filtro ?? 'todos'
  const busqueda = (params.q ?? '').trim().toLowerCase()
  let visibles = conEstado
  if (filtro === 'quedados') visibles = visibles.filter((fila) => esQuedado(fila))
  if (filtro === 'sin_pesar') visibles = visibles.filter((fila) => fila.sinPesarEnLaUltima)
  if (filtro === 'listos') visibles = visibles.filter((fila) => fila.listo)
  if (busqueda) {
    visibles = visibles.filter((fila) => fila.chapeta.toLowerCase().includes(busqueda))
  }

  // Peor primero por defecto: la pantalla se abre para ver a quién hay que
  // mirarle algo, no para ver al campeón. Los sin dato van al final en los
  // dos órdenes numéricos -- no son ni los peores ni los mejores.
  const orden = params.orden ?? 'peor'
  visibles = [...visibles].sort((a, b) => {
    if (orden === 'chapeta') return a.chapeta.localeCompare(b.chapeta)
    if (a.gdpPeriodo === null) return 1
    if (b.gdpPeriodo === null) return -1
    return orden === 'mejor' ? b.gdpPeriodo - a.gdpPeriodo : a.gdpPeriodo - b.gdpPeriodo
  })

  const vista: Vista = params.vista === 'tabla' ? 'tabla' : 'rejilla'

  const seleccionando = params.sel !== undefined

  return (
    <Marco>
      <EncabezadoPagina
        titulo={
          <>
            {lote.nombre} va en{' '}
            <b className="font-extrabold text-tierra">{formatearGdp(resumen.promedio)}</b>.{' '}
            {quedados.length > 0 && (
              <span className="font-extrabold text-barro">
                {quedados.length === 1
                  ? 'Un novillo está quedado.'
                  : `${quedados.length} novillos están quedados.`}
              </span>
            )}
          </>
        }
        bajada={
          <>
            <span data-testid="bajada">{frases.join(' ')}</span>
            {avisos.length > 0 && (
              <div data-testid="avisos" className="mt-3 flex flex-col gap-[7px]">
                {avisos.map((aviso) => (
                  <div key={aviso.texto} className="flex flex-wrap items-center gap-[9px]">
                    <span
                      aria-hidden
                      className={`h-[6px] w-[6px] flex-none rounded-full ${
                        aviso.grave ? 'bg-barro' : 'bg-carbon-3'
                      }`}
                    />
                    <span>{aviso.texto}</span>
                    {aviso.enlace && (
                      <Link
                        href={aviso.enlace.href}
                        className="text-carbon underline underline-offset-[3px]"
                      >
                        {aviso.enlace.texto}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        }
        acciones={
          <>
            <BotonSeleccionar />
            <Link
              href={`/anotar/pesos?lote=${lote.id}`}
              className="rounded-full bg-monte px-4 py-2 text-[13px] font-semibold text-papel no-underline"
            >
              Anotar pesos
            </Link>
          </>
        }
      />

      <Cinta celdas={celdas} />

      <h2 className="rotulo mb-3 mt-9">Cómo viene engordando el lote</h2>
      <GraficaLote serie={await serieDePesoPromedio(lote.id, hoy)} />

      <h2 className="rotulo mb-3 mt-9">El ganado</h2>
      <FiltrosGanado
        lotes={lotes.map((l) => ({ id: l.id, nombre: l.nombre, animales: l.animalesActivos }))}
        chips={chips}
      />
      <ListaGanado
        filas={visibles}
        vista={vista}
        seleccionando={seleccionando}
        loteId={lote.id}
      />

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
      SOFIA — por Sofanor Echeverría.
    </footer>
  )
}
