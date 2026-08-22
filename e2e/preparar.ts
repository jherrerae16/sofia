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
    // Los eventos sanitarios y los movimientos apuntan a un animal o a un
    // lote (`EventoSanitario_animalId_fkey`, `EventoSanitario_loteId_fkey`,
    // `Movimiento_loteId_fkey`): hay que borrarlos antes de borrar animales
    // y lotes, o la base rechaza esos `deleteMany()` con una violación de
    // clave foránea. Hoy ninguna prueba de navegador crea todavía un evento
    // sanitario, así que este `deleteMany()` no borra nada en la práctica --
    // pero está aquí desde ya, no el día que la primera prueba lo necesite,
    // que es tarde: para entonces ya habría reventado con el mismo error de
    // clave foránea que ya se corrigió una vez para `Movimiento`.
    await prisma.eventoSanitario.deleteMany()
    await prisma.movimiento.deleteMany()
    await prisma.medicion.deleteMany()
    await prisma.pesaje.deleteMany()
    await prisma.animal.deleteMany()
    await prisma.lote.deleteMany()
    await prisma.usuario.deleteMany()

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
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
