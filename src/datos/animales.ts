import { Prisma, type EstadoAnimal } from '@prisma/client'
import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { validarMedicion, validarPesoEntrada } from '@/calc/validacion'
import { prisma } from './cliente'
import { aFechaDb, aFechaISO, aKg } from './conversion'
import { historialDeAnimal, ultimoPesoPorAnimal } from './pesajes'

export type DatosAlta = {
  loteId: string
  chapetas: string[]
  sexo: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  edadEntradaMeses: number | null
  pesos: Record<string, number>
  /**
   * Deja pasar una tanda que trae uno o más pesos de entrada con advertencia
   * (ver `PesoEntradaSospechosoError` más abajo). Sin esto en `true`, un peso
   * de entrada inusual frena el alta entera -- no la rechaza sola en
   * silencio ni tampoco la deja pasar sin que nadie la vea.
   *
   * Es una sola casilla para TODA la tanda, no una por chapeta: la planilla
   * puede traer hasta 56 líneas, y una confirmación por animal sería tedioso
   * y entrenaría al dueño a marcar sin leer. Reevaluar la tanda completa
   * también significa que corregir el valor que disparó la advertencia (y
   * volver a enviar) hace que esa advertencia ya no aparezca -- no queda una
   * casilla exigida sobre un dato que ya se corrigió.
   */
  confirmarPesosSospechosos?: boolean
}

export type AnimalVista = {
  id: string
  chapeta: string
  loteId: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  pesoEntradaKg: number
  estado: EstadoAnimal
  /**
   * Datos de la salida (hallazgo 2.4): sin ellos, un animal vendido, muerto o
   * robado se veía idéntico a uno activo en cualquier pantalla que solo
   * mostrara `estado`, y la lista de "qué salió de este lote" no tenía de
   * dónde salir. Los tres quedan en null mientras el animal siga activo.
   */
  fechaSalida: FechaISO | null
  motivoSalida: string | null
  pesoSalidaKg: number | null
}

export type ConflictoChapeta = {
  chapeta: string
  loteNombre: string
  fechaEntrada: FechaISO
  pesoUltimoKg: number | null
}

function describirConflicto(c: ConflictoChapeta): string {
  const peso = c.pesoUltimoKg === null ? 'sin pesaje todavía' : `último peso ${c.pesoUltimoKg} kg`
  return `lote ${c.loteNombre}, entró el ${c.fechaEntrada}, ${peso}`
}

/**
 * Una o más de las chapetas que se intentaron dar de alta ya están activas en
 * otro animal. Se distingue de un `Error` genérico para que la interfaz
 * pueda mostrar, por cada chapeta en conflicto, de cuál animal se trata --
 * en qué lote está, desde cuándo, y su último peso si lo tiene -- en vez de
 * un simple "chapeta duplicada" que obliga a ir a buscarlo a mano. El
 * `.message` ya trae ese detalle en texto, para quien solo capture el error
 * como un `Error` cualquiera.
 */
export class ChapetaDuplicadaError extends Error {
  conflictos: ConflictoChapeta[]

  constructor(conflictos: ConflictoChapeta[]) {
    super(
      conflictos.length === 1
        ? `La chapeta ${conflictos[0].chapeta} ya está activa (${describirConflicto(conflictos[0])}).`
        : `${conflictos.length} chapetas ya están activas: ` +
            conflictos.map((c) => `${c.chapeta} (${describirConflicto(c)})`).join('; ') +
            '.',
    )
    this.name = 'ChapetaDuplicadaError'
    this.conflictos = conflictos
  }
}

export type AdvertenciaPesoEntrada = { chapeta: string; mensaje: string }

/**
 * Uno o más pesos de entrada de la tanda quedan fuera del rango típico de un
 * novillo de ceba en Colombia -- ver `validarPesoEntrada` en
 * `src/calc/validacion.ts`. No se rechaza de plano: la doctrina es "rechaza
 * lo imposible, advierte lo improbable", y un novillo de entrada gordo (o
 * livianito, recién destetado) existe de verdad. Pero tampoco se deja pasar
 * en silencio: `crearAnimales` lanza esta excepción a menos que quien llama
 * confirme con `confirmarPesosSospechosos`, para que la interfaz pueda
 * mostrarle la advertencia al dueño antes de guardar nada.
 */
export class PesoEntradaSospechosoError extends Error {
  advertencias: AdvertenciaPesoEntrada[]

  constructor(advertencias: AdvertenciaPesoEntrada[]) {
    super(
      advertencias.length === 1
        ? `Revisa el peso de entrada de la chapeta ${advertencias[0].chapeta}: ${advertencias[0].mensaje}`
        : `Revisa el peso de entrada de ${advertencias.length} chapetas: ` +
            advertencias.map((a) => `${a.chapeta} — ${a.mensaje}`).join(' | '),
    )
    this.name = 'PesoEntradaSospechosoError'
    this.advertencias = advertencias
  }
}

/**
 * Da de alta un lote completo en una sola transacción.
 * O entran todos o no entra ninguno: un alta a medias deja el lote descuadrado
 * y obliga a adivinar cuáles chapetas faltaron.
 *
 * La chapeta es única solo entre animales ACTIVOS (índice único parcial, ver
 * `prisma/migrations/20260822225112_chapeta_unica_por_activo/migration.sql`):
 * un animal que ya salió -- vendido, muerto o robado -- libera su número
 * para que un lote nuevo lo reutilice. La comprobación de abajo, contra
 * `estado: 'activo'`, es solo para dar un mensaje legible con el lote, la
 * fecha y el último peso del animal en conflicto -- la unicidad de verdad la
 * impone la base de datos, no esta comprobación: si dos altas simultáneas
 * pasaran esta comprobación para la misma chapeta nueva, solo una de las dos
 * inserciones podría ganar la carrera contra el índice, y la otra fallaría
 * con `P2002` dentro de la transacción (capturado más abajo).
 */
export async function crearAnimales(datos: DatosAlta): Promise<number> {
  // Defecto 2 del seguimiento del plan 1c: antes de esta guardia, aquí solo
  // se comprobaba que el peso fuera finito y mayor que cero -- un novillo
  // dado de alta con 2200 kg entraba en silencio. El peso de entrada es la
  // base de todos los kilos producidos del ciclo: si está inflado, la
  // producción entera y el costo por kilo salen mal, y nada avisa.
  //
  // `validarPesoEntrada` no tiene un pesaje anterior contra el cual comparar
  // -- es el primer dato del animal -- así que evalúa un rango absoluto, no
  // una ganancia entre dos mediciones (ver `src/calc/validacion.ts`).
  const advertenciasPeso: AdvertenciaPesoEntrada[] = []
  for (const chapeta of datos.chapetas) {
    const peso = datos.pesos[chapeta]
    if (peso === undefined) {
      throw new Error(`Falta el peso de entrada de la chapeta ${chapeta}.`)
    }
    const veredicto = validarPesoEntrada(peso)
    if (veredicto.nivel === 'rechazo') {
      throw new Error(`El peso de entrada de la chapeta ${chapeta} no es válido: ${veredicto.mensaje}`)
    }
    if (veredicto.nivel === 'advertencia') {
      advertenciasPeso.push({ chapeta, mensaje: veredicto.mensaje })
    }
  }

  if (advertenciasPeso.length > 0 && !datos.confirmarPesosSospechosos) {
    throw new PesoEntradaSospechosoError(advertenciasPeso)
  }

  const activasExistentes = await prisma.animal.findMany({
    where: { chapeta: { in: datos.chapetas }, estado: 'activo' },
    select: { id: true, chapeta: true, fechaEntrada: true, lote: { select: { nombre: true } } },
  })
  if (activasExistentes.length > 0) {
    const ultimos = await ultimoPesoPorAnimal()
    throw new ChapetaDuplicadaError(
      activasExistentes.map((animal) => ({
        chapeta: animal.chapeta,
        loteNombre: animal.lote.nombre,
        fechaEntrada: aFechaISO(animal.fechaEntrada),
        pesoUltimoKg: ultimos.get(animal.id)?.pesoKg ?? null,
      })),
    )
  }

  try {
    await prisma.$transaction(
      datos.chapetas.map((chapeta) =>
        prisma.animal.create({
          data: {
            chapeta,
            loteId: datos.loteId,
            sexo: datos.sexo,
            raza: datos.raza,
            cruce: datos.cruce,
            proveedor: datos.proveedor,
            fechaEntrada: aFechaDb(datos.fechaEntrada),
            edadEntradaMeses: datos.edadEntradaMeses,
            pesoEntradaKg: datos.pesos[chapeta],
          },
        }),
      ),
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(
        'No se creó ningún animal: alguna chapeta de la tanda quedó activa dos veces (¿la ' +
          'misma chapeta escrita dos veces en la planilla, o una alta simultánea que ganó la ' +
          'carrera?). Corrige la planilla y vuelve a intentarlo.',
      )
    }
    throw error
  }

  return datos.chapetas.length
}

export type EstadoSalida = Exclude<EstadoAnimal, 'activo'>

const ESTADOS_SALIDA: readonly EstadoSalida[] = ['vendido', 'muerto', 'robado']

export type DatosSalida = {
  animalIds: string[]
  estado: EstadoSalida
  fechaSalida: FechaISO
  /** Obligatorio para muerte y robo; opcional para venta. */
  motivoSalida: string | null
  /**
   * Último peso real del animal, por id. Cabe naturalmente aquí porque es un
   * dato de engorde -- no de plata: el precio, el comprador y las comisiones
   * son del plan 2. Un animal sin entrada en este mapa queda con
   * `pesoSalidaKg` en null.
   */
  pesosSalida: Record<string, number>
  /**
   * Deja pasar una tanda que trae uno o más pesos de venta con advertencia
   * (ver `PesoSalidaSospechosoError` más abajo). Sin esto en `true`, un
   * peso de venta con ganancia diaria o pérdida inverosímil frena la
   * escritura entera -- no la rechaza sola en silencio ni tampoco la deja
   * pasar sin que nadie la vea. Es lo que la interfaz enciende después de
   * mostrarle la advertencia al ganadero y que él decida seguir.
   */
  confirmarPesosSospechosos?: boolean
}

export type AdvertenciaPesoSalida = { chapeta: string; mensaje: string; gdp: number | null }

/**
 * Uno o más pesos de venta de la tanda resultan una ganancia diaria o una
 * pérdida inverosímil frente al historial del animal -- el mismo umbral que
 * ya usa `validarMedicion` para cualquier pesaje digitado (ver el hallazgo
 * 2.1 del seguimiento). No se rechaza de plano: la doctrina de esa guardia
 * es "rechaza lo imposible, advierte lo improbable", y un animal puede de
 * verdad haber engordado mucho. Pero tampoco se deja pasar en silencio --
 * que era justo el bug: `registrarSalida` lanza esta excepción a menos que
 * quien llama confirme con `confirmarPesosSospechosos`, para que la interfaz
 * pueda mostrarle la advertencia al ganadero antes de guardar nada.
 */
export class PesoSalidaSospechosoError extends Error {
  advertencias: AdvertenciaPesoSalida[]

  constructor(advertencias: AdvertenciaPesoSalida[]) {
    super(
      advertencias.length === 1
        ? `Revisa el peso de venta de la chapeta ${advertencias[0].chapeta}: ${advertencias[0].mensaje}`
        : `Revisa el peso de venta de ${advertencias.length} chapetas: ` +
            advertencias.map((a) => `${a.chapeta} — ${a.mensaje}`).join(' | '),
    )
    this.name = 'PesoSalidaSospechosoError'
    this.advertencias = advertencias
  }
}

/**
 * Saca uno o varios animales de un lote a la vez: venta, muerte o robo. Es lo
 * que le permite al ganadero vender el lote completo el mismo día de la
 * feria en una sola operación, con la fecha y el motivo compartidos por
 * todos los animales seleccionados.
 *
 * O salen todos o no sale ninguno, igual que `crearAnimales`: una salida a
 * medias -- 54 animales vendidos y 2 todavía "activos" por un fallo a mitad
 * de camino -- deja el lote descuadrado y obliga a adivinar cuáles faltaron.
 */
export async function registrarSalida(datos: DatosSalida, hoy: FechaISO): Promise<number> {
  if (datos.animalIds.length === 0) {
    throw new Error('No se seleccionó ningún animal para registrar la salida.')
  }

  // Hallazgo 2.2: `registrarSalida({ estado: 'activo' })` se aceptaba sin
  // más -- alcanzable solo con una petición que no pasa por el `<select>` de
  // tres opciones del formulario, pero `registrarSalida` no puede confiar en
  // que todo llamador futuro sí pase por ahí. `EstadoSalida` ya excluye
  // 'activo' en el tipo, pero un tipo de TypeScript no protege nada en
  // tiempo de ejecución contra una petición manual.
  if (!ESTADOS_SALIDA.includes(datos.estado)) {
    throw new Error(
      `Estado de salida inválido: "${datos.estado}". Debe ser vendido, muerto o robado.`,
    )
  }

  const motivoLimpio = datos.motivoSalida?.trim() || null
  if ((datos.estado === 'muerto' || datos.estado === 'robado') && motivoLimpio === null) {
    throw new Error(
      `Registrar un animal como ${datos.estado} necesita un motivo: explica qué pasó.`,
    )
  }

  if (diasEntre(hoy, datos.fechaSalida) > 0) {
    throw new Error('La fecha de salida no puede ser posterior a hoy.')
  }

  const animales = await prisma.animal.findMany({
    where: { id: { in: datos.animalIds } },
    select: { id: true, chapeta: true, estado: true, fechaEntrada: true, pesoEntradaKg: true },
  })
  const porId = new Map(animales.map((a) => [a.id, a]))

  // Se valida por chapeta, no por id, para que el mensaje de error le sirva
  // al ganadero sin tener que ir a buscar a qué animal corresponde el id.
  for (const animalId of datos.animalIds) {
    const animal = porId.get(animalId)
    if (!animal) {
      throw new Error(`El animal ${animalId} no existe.`)
    }
    if (animal.estado !== 'activo') {
      throw new Error(`La chapeta ${animal.chapeta} ya salió (${animal.estado}); no puede volver a salir.`)
    }
    if (diasEntre(aFechaISO(animal.fechaEntrada), datos.fechaSalida) < 0) {
      throw new Error(
        `La chapeta ${animal.chapeta} no puede salir antes de su fecha de entrada (${aFechaISO(animal.fechaEntrada)}).`,
      )
    }
  }

  // Hallazgo 2.1: el peso de venta es el último peso real del animal y
  // merece la misma vigilancia que cualquier otro -- la misma guardia
  // (`validarMedicion`) que ya usa "Digitar" para cazar un dedazo en el
  // momento, no tres meses después cuando ya contaminó los kilos producidos
  // de la portada. Antes de esta guardia, aquí solo se comprobaba que el
  // peso fuera finito y mayor que cero: un 2200 en vez de 220 pasaba esa
  // comprobación sin más y quedaba aceptado en silencio.
  //
  // Se llama con `contexto: 'salida'` -- no el valor por omisión 'pesaje' --
  // porque el peso de venta no es un segundo pesaje del animal, es otro
  // hecho: se pesa el lote en la mañana y se vende en la tarde, mismo día,
  // y las dos cifras son reales. La regla de "mismo día" de `validarMedicion`
  // existe para atrapar un reenvío accidental en la pantalla de Digitar, no
  // para bloquear una venta que ocurre el mismo día de un pesaje real. Sin
  // este contexto, un pesaje del mismo día dejaba la venta sin ninguna salida
  // limpia: mentir en la fecha o anular el pesaje, y las dos destruyen un
  // dato bueno.
  const advertenciasPeso: AdvertenciaPesoSalida[] = []
  for (const [animalId, peso] of Object.entries(datos.pesosSalida)) {
    const animal = porId.get(animalId)
    const chapeta = animal?.chapeta ?? animalId
    if (!Number.isFinite(peso)) {
      throw new Error(`El peso de venta de la chapeta ${chapeta} no es un número.`)
    }
    if (peso <= 0) {
      throw new Error(`El peso de venta de la chapeta ${chapeta} debe ser mayor que cero.`)
    }
    // Un animal que no existe ya se rechazó arriba (loop de `animalIds`) si
    // está en la selección; si llegó aquí sin estar en `porId` es un id que
    // ni siquiera se seleccionó -- no hay historial contra qué comparar.
    if (!animal) continue

    // Se compara contra el último pesaje real anterior o igual a la fecha de
    // salida -- o, si el animal nunca se pesó, contra su peso de entrada.
    // Mismo patrón que `revisarTanda` en `src/datos/pesajes.ts`.
    const historial = await historialDeAnimal(animalId)
    const anterior = historial.filter((m) => m.fecha <= datos.fechaSalida).at(-1) ?? null
    const entrada = { fecha: aFechaISO(animal.fechaEntrada), pesoKg: aKg(animal.pesoEntradaKg) }
    const veredicto = validarMedicion(
      entrada,
      anterior,
      { fecha: datos.fechaSalida, pesoKg: peso },
      hoy,
      'normal',
      'salida',
    )

    if (veredicto.nivel === 'rechazo') {
      throw new Error(`El peso de venta de la chapeta ${chapeta} no es válido: ${veredicto.mensaje}`)
    }
    if (veredicto.nivel === 'advertencia') {
      advertenciasPeso.push({ chapeta, mensaje: veredicto.mensaje, gdp: veredicto.gdp })
    }
  }

  if (advertenciasPeso.length > 0 && !datos.confirmarPesosSospechosos) {
    throw new PesoSalidaSospechosoError(advertenciasPeso)
  }

  // La condición `estado: 'activo'` va en el propio `where` de cada `update`,
  // no en un chequeo previo separado: es la base de datos, no el proceso de
  // Node, la que garantiza que dos salidas concurrentes sobre el mismo animal
  // (dos pestañas, un doble clic) no puedan pisarse. El chequeo de arriba
  // (contra lo que se leyó hace un instante) ya cubre el caso normal y da un
  // mensaje con la chapeta; esta guardia cubre la carrera que ese chequeo no
  // puede ver. Si alguna pierde la carrera, `update` no encuentra fila, Prisma
  // lo reporta como `P2025` y toda la tanda se revierte -- mismo patrón que
  // `anularPesaje` en `src/datos/pesajes.ts`.
  try {
    await prisma.$transaction(
      datos.animalIds.map((animalId) =>
        prisma.animal.update({
          where: { id: animalId, estado: 'activo' },
          data: {
            estado: datos.estado,
            fechaSalida: aFechaDb(datos.fechaSalida),
            motivoSalida: motivoLimpio,
            pesoSalidaKg: datos.pesosSalida[animalId] ?? null,
          },
        }),
      ),
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error(
        'No se registró ninguna salida: al menos un animal de la tanda ya había salido antes de terminar de guardar.',
      )
    }
    // Hallazgo 2.3: un peso de venta desmedido (99999 en vez de, digamos,
    // 999.9) desborda la columna `Decimal(5,1)` -- Postgres lo rechaza con
    // "numeric field overflow" y Prisma lo envuelve como `P2020`. Sin
    // traducir, eso llegaba a la pantalla como
    // "Invalid `prisma.animal.update()` invocation in .../animales.ts:240:23",
    // con rutas de archivo y números de línea que no le dicen nada al
    // ganadero. La transacción de todas formas revierte bien -- esto es
    // cosmético, pero es la ruta de escape de cualquier error no previsto.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2020') {
      throw new Error(
        'No se registró ninguna salida: algún peso de venta de la tanda es demasiado grande para guardarse (máximo 9999,9 kg). Revisa que no haya un dedazo.',
      )
    }
    throw error
  }

  return datos.animalIds.length
}

export async function listarAnimalesDeLote(loteId: string): Promise<AnimalVista[]> {
  const animales = await prisma.animal.findMany({
    where: { loteId },
    orderBy: { chapeta: 'asc' },
  })

  return animales.map((animal) => ({
    id: animal.id,
    chapeta: animal.chapeta,
    loteId: animal.loteId,
    raza: animal.raza,
    cruce: animal.cruce,
    proveedor: animal.proveedor,
    fechaEntrada: aFechaISO(animal.fechaEntrada),
    pesoEntradaKg: aKg(animal.pesoEntradaKg),
    estado: animal.estado,
    fechaSalida: animal.fechaSalida ? aFechaISO(animal.fechaSalida) : null,
    motivoSalida: animal.motivoSalida,
    pesoSalidaKg: animal.pesoSalidaKg ? aKg(animal.pesoSalidaKg) : null,
  }))
}
