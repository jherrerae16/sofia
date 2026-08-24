// Carga .env.test explícitamente, con override, igual que vitest.config.ts: así
// este script apunta a la base de pruebas sin depender de que quien lo corra
// recuerde escribir el prefijo DATABASE_URL=... en la línea de comandos. Es la
// primera capa de protección; la segunda es `exigirBaseDePrueba` más abajo, que
// no depende de esta.
//
// Los `import` de `bcryptjs` y de `../src/datos/cliente` se hacen más abajo con
// `import()` dinámico, a propósito, en vez de con `import` estático: los
// `import` estáticos se izan por encima de cualquier otra instrucción del
// archivo (incluida la llamada a `config()` de aquí abajo), sin importar en qué
// orden aparezcan en el código fuente. Con un `import` estático, `cliente.ts`
// leería `DATABASE_URL` antes de que `.env.test` se hubiera cargado — y de
// hecho fue exactamente el bug que este comentario documenta: sin él, este
// script terminaba intentando conectarse a una base inexistente porque
// `DATABASE_URL` todavía no existía en `process.env` en el momento en que
// `cliente.ts` la leía.
import { config } from 'dotenv'
// `quiet: true` calla la publicidad de terceros que dotenv imprime en cada
// carga (enlaces externos, y con texto que cambia entre corridas): es
// contenido inyectado en la salida de las pruebas que no aporta nada aquí.
config({ path: '.env.test', override: true, quiet: true })

// Se importa arriba, estático: `fechas.ts` no lee variables de entorno, así
// que no le aplica la razón por la que bcrypt y el cliente de Prisma más
// abajo sí se importan dinámicamente.
import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'

// Relativa a hoy, no absoluta: una fecha de entrada fija (como la
// `2026-09-01` que tenía este archivo antes) se queda quieta mientras
// `hoyBogota()` avanza cada día. Tarde o temprano la fecha de entrada queda
// por delante de hoy, y entonces no cabe ningún pesaje válido entre la
// entrada y hoy (el pesaje tiene que ser posterior a la entrada y no
// posterior a hoy) -- que es exactamente lo que le pasó a las pruebas de
// navegador. Sembrar la entrada 30 días atrás de hoy es una ventana que
// nunca caduca.
const FECHA_ENTRADA = sumarDias(hoyBogota(), -30)

/**
 * Segunda capa de protección, independiente de la carga de `.env.test` de
 * arriba: si por lo que sea `DATABASE_URL` termina apuntando a otra base (una
 * variable ya exportada en el entorno, un cambio futuro en cómo se invoca este
 * script, etc.), este chequeo aborta antes de que corra el primer `deleteMany`.
 *
 * Se exige que el nombre de la base termine en "_test", que es la convención
 * que ya usa este repo (`sofia` / `sofia_test`). No se compara contra el
 * nombre exacto de la base real ("no es 'sofia'") a propósito: esa lista
 * negra se queda corta en cuanto exista una segunda base real con otro
 * nombre. Exigir el sufijo "_test" es una lista blanca — solo pasa lo que se
 * declaró explícitamente como base de pruebas.
 */
function exigirBaseDePrueba(): void {
  const cadena = process.env.DATABASE_URL ?? ''
  let nombreBase = ''
  try {
    nombreBase = new URL(cadena).pathname.replace(/^\//, '')
  } catch {
    // DATABASE_URL vacía o mal formada: nombreBase se queda vacía y cae en el
    // mismo abandono de abajo, con el mensaje mostrando la cadena cruda.
  }

  if (!nombreBase.endsWith('_test')) {
    // Se lanza en vez de llamar a process.exit() directamente: exit() corta el
    // proceso antes de que el stdout/stderr redirigido a una tubería (como
    // cuando esta salida se captura para un informe) termine de escribirse, y
    // este mensaje es justo el que no se puede perder.
    throw new Error(
      `Abortado: DATABASE_URL apunta a "${nombreBase || cadena}", que no es una base de pruebas ` +
        '(se exige que el nombre termine en "_test"). ' +
        'Este script borra usuarios, lotes y animales — correrlo contra la base real se llevaría ' +
        'por delante los datos de la finca. No se borró nada.',
    )
  }
}

async function main() {
  exigirBaseDePrueba()

  // El guardia de arriba corre antes de esta línea: si aborta, `cliente.ts`
  // nunca se importa y nunca se abre ninguna conexión.
  const { default: bcrypt } = await import('bcryptjs')
  const { prisma } = await import('../src/datos/cliente')

  try {
    // `Movimiento_loteId_fkey` sí es una clave foránea normal (`loteId` no es
    // opcional en `Movimiento`), así que ese `deleteMany()` sí evita una
    // violación de clave foránea al borrar lotes más abajo. `EventoSanitario`
    // es hoy el mismo caso: desde que la historia sanitaria cuelga del animal
    // (`animalId` obligatorio), borrar un animal de una corrida anterior sin
    // haber borrado antes sus eventos viola
    // `EventoSanitario_animalId_fkey`. Su `loteId` sí sigue siendo opcional,
    // pero eso ya no cambia nada: basta el animal para exigir este orden.
    await prisma.eventoSanitario.deleteMany()
    // `Novedad.loteId` y `Novedad.potreroId` son opcionales, así que borrar
    // un lote o un potrero de una corrida anterior no viola ninguna clave
    // foránea -- Prisma los pone en `null` (mismo caso que
    // `EventoSanitario` arriba). Pero a diferencia de ese caso, esto sí
    // mordió en la práctica: `e2e/exportar.spec.ts` siembra una novedad con
    // una descripción fija y la busca después por esa descripción. Sin este
    // `deleteMany()`, la novedad huérfana de una corrida anterior (con
    // `loteId` ya en `null`) sobrevive para siempre en la base y empata en
    // fecha con la novedad fresca de la corrida siguiente -- `.find()` en la
    // prueba puede terminar quedándose con la vieja, sin lote, en vez de la
    // recién sembrada.
    await prisma.novedad.deleteMany()
    await prisma.movimiento.deleteMany()
    await prisma.medicion.deleteMany()
    await prisma.pesaje.deleteMany()
    await prisma.animal.deleteMany()
    await prisma.lote.deleteMany()
    // Los potreros no tienen ninguna prueba que dependa de datos limpios
    // hasta la que mueve un lote (`e2e/mover-lote.spec.ts`): esa prueba
    // crea sus propios potreros con nombres fijos (`@unique` en el
    // esquema), así que sin este `deleteMany()` la segunda corrida de
    // `npm run test:e2e` chocaría contra esos mismos nombres.
    await prisma.potrero.deleteMany()
    await prisma.usuario.deleteMany()
    // e2e/configuracion.spec.ts es la primera prueba de navegador que toca
    // Parametro y Finca: sin limpiarlos aquí, cada corrida de
    // `npm run test:e2e` iría agregando vigencias nuevas encima de las de la
    // corrida anterior, y esa prueba dejaría de poder afirmar con certeza
    // cuál es "el" valor vigente hoy o cuántas filas trae el histórico.
    await prisma.parametro.deleteMany()
    await prisma.finca.deleteMany()
    await prisma.finca.create({ data: { nombre: 'Santa Verónica' } })
    // Las hectáreas útiles viven en Parametro, no en Finca (ver
    // src/datos/parametros.ts): se siembran con una vigencia ya pasada, igual
    // que en prisma/seed.ts, para que "Configuración" muestre un valor vigente
    // desde la primera corrida sin que ninguna prueba tenga que configurarlo.
    //
    // La meta de ganancia y el peso de venta NO se siembran aquí, a propósito:
    // `e2e/finca.spec.ts` afirma sobre ellos que están "sin configurar
    // todavía", y sembrarlos le quita el piso a esas pruebas. Las pantallas
    // que los necesitan los siembran y los recogen en su propio archivo.
    await prisma.parametro.create({
      data: { clave: 'hectareas_utiles', valor: '35', vigenteDesde: new Date('2000-01-01T00:00:00.000Z') },
    })

    await prisma.usuario.create({
      data: {
        nombre: 'Joseph',
        correo: 'joseph@ejemplo.com',
        claveHash: await bcrypt.hash('claveDePrueba', 12),
      },
    })

    const lote = await prisma.lote.create({
      data: { nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: aFechaDb(FECHA_ENTRADA) },
    })

    // Cinco chapetas, no dos: la prueba de F1 en digitar.spec.ts (corregir
    // una fila después de revisar no debe borrar las demás) necesita varias
    // filas digitadas a la vez para poder demostrar que sobreviven todas,
    // no solo la que se corrigió.
    for (const chapeta of ['001', '002', '003', '004', '005']) {
      await prisma.animal.create({
        data: {
          chapeta,
          loteId: lote.id,
          sexo: 'macho',
          raza: 'Brahman',
          fechaEntrada: aFechaDb(FECHA_ENTRADA),
          pesoEntradaKg: 150,
        },
      })
    }

    await sembrarLoteDeLaPortada(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Un segundo lote, aparte de "Ceba 01", con la historia completa que la
 * pantalla Ganado necesita para poder decir algo: catorce animales, dos
 * tandas de pesaje (la última cubriendo diez de los catorce), un potrero
 * debajo y una desparasitación ya vencida.
 *
 * Va en un lote propio y no encima de "Ceba 01" a propósito: las pruebas de
 * digitar, salidas y lotes leen los pesos de ese lote y afirman cosas sobre
 * él. Meterle dos tandas de historia cambiaría lo que esas pruebas ven sin
 * que ninguna de ellas lo hubiera pedido.
 */
async function sembrarLoteDeLaPortada(
  prisma: typeof import('../src/datos/cliente')['prisma'],
): Promise<void> {
  const HOY = hoyBogota()
  const ENTRADA = sumarDias(HOY, -90)
  const TANDA_VIEJA = sumarDias(HOY, -60)
  const TANDA_NUEVA = sumarDias(HOY, -20)

  const potrero = await prisma.potrero.create({
    data: {
      nombre: 'La Loma',
      hectareas: 8,
      capacidadKg: 8000,
      tipoPasto: 'colosuana',
      tieneAgua: true,
    },
  })

  const lote = await prisma.lote.create({
    data: {
      nombre: 'Ceba 02',
      tipo: 'ceba',
      fechaApertura: aFechaDb(ENTRADA),
      potreroActualId: potrero.id,
      fechaEntradaPotrero: aFechaDb(sumarDias(HOY, -25)),
    },
  })

  const chapetas = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(3, '0'))
  const animales = []
  for (const chapeta of chapetas) {
    animales.push(
      await prisma.animal.create({
        data: {
          chapeta: `C2-${chapeta}`,
          loteId: lote.id,
          sexo: 'macho',
          raza: 'Brangus',
          fechaEntrada: aFechaDb(ENTRADA),
          pesoEntradaKg: 150,
        },
      }),
    )
  }

  // Primera tanda: los catorce, treinta días después de entrar, a 700 g/día.
  await prisma.pesaje.create({
    data: {
      fecha: aFechaDb(TANDA_VIEJA),
      metodo: 'cinta',
      responsable: 'Joseph',
      registradoPorId: 'siembra',
      mediciones: { create: animales.map((animal) => ({ animalId: animal.id, pesoKg: 171 })) },
    },
  })

  // Segunda tanda: solo diez de los catorce -- los cuatro últimos no se
  // dejaron pesar, que es el caso que la gráfica tiene que saber avisar. De
  // los diez, cuatro vienen quedados (250 g/día, muy por debajo de la meta de
  // 750) y seis vienen bien (800 g/día).
  await prisma.pesaje.create({
    data: {
      fecha: aFechaDb(TANDA_NUEVA),
      metodo: 'cinta',
      responsable: 'Joseph',
      registradoPorId: 'siembra',
      mediciones: {
        create: animales.slice(0, 10).map((animal, i) => ({
          animalId: animal.id,
          pesoKg: i < 4 ? 181 : 203,
        })),
      },
    },
  })

  // Una desparasitación cuya próxima fecha ya pasó: es el aviso que la
  // portada tiene que mostrar y que la pantalla de Sanidad tendrá que poder
  // apagar. Una fila por animal, que es como cuelga la historia sanitaria.
  await prisma.eventoSanitario.createMany({
    data: animales.map((animal) => ({
      tipo: 'desparasitacion' as const,
      fecha: aFechaDb(sumarDias(HOY, -80)),
      producto: 'Ivermectina 1%',
      dosis: '1 ml / 50 kg',
      responsable: 'Joseph',
      proximaFecha: aFechaDb(sumarDias(HOY, -12)),
      animalId: animal.id,
      loteId: lote.id,
      registradoPorId: 'siembra',
    })),
  })
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
