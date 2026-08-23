/**
 * Siembra una finca de demostración para poder recorrer la plataforma con
 * datos que se parezcan a los de verdad.
 *
 * NO se corre contra la base real. Exige que el nombre de la base termine en
 * "_demo", igual que `e2e/preparar.ts` exige "_test": borra lotes, animales y
 * pesajes antes de sembrar, y hacerlo sobre la finca de verdad sería perder
 * el trabajo de un ciclo entero.
 *
 *   createdb sofia_demo
 *   DATABASE_URL="postgresql://USUARIO@localhost:5432/sofia_demo" npx prisma migrate deploy
 *   DATABASE_URL="postgresql://USUARIO@localhost:5432/sofia_demo" npx tsx scripts/sembrar-demo.ts
 *   DATABASE_URL="postgresql://USUARIO@localhost:5432/sofia_demo" npm run dev
 */
import { config } from 'dotenv'
config({ quiet: true })

import { hoyBogota, sumarDias } from '../src/calc/fechas'
import { aFechaDb } from '../src/datos/conversion'

function exigirBaseDeDemostracion(): void {
  const cadena = process.env.DATABASE_URL ?? ''
  let nombreBase = ''
  try {
    nombreBase = new URL(cadena).pathname.replace(/^\//, '')
  } catch {
    // Cadena vacía o mal formada: cae en el abandono de abajo.
  }
  if (!nombreBase.endsWith('_demo')) {
    console.error(
      `Este script solo corre contra una base cuyo nombre termine en "_demo".\n` +
        `DATABASE_URL apunta a "${nombreBase || cadena}".\n` +
        `Borra lotes, animales y pesajes: contra la finca de verdad sería perder un ciclo entero.`,
    )
    process.exit(1)
  }
}

async function main() {
  exigirBaseDeDemostracion()

  const { default: bcrypt } = await import('bcryptjs')
  const { prisma } = await import('../src/datos/cliente')

  const HOY = hoyBogota()
  const ENTRADA = sumarDias(HOY, -112)

  try {
    // En el orden que exigen las llaves foráneas.
    await prisma.medicion.deleteMany()
    await prisma.eventoSanitario.deleteMany()
    await prisma.movimiento.deleteMany()
    await prisma.novedad.deleteMany()
    await prisma.pesaje.deleteMany()
    await prisma.animal.deleteMany()
    await prisma.lote.deleteMany()
    await prisma.potrero.deleteMany()
    await prisma.usuario.deleteMany()
    await prisma.parametro.deleteMany()
    await prisma.finca.deleteMany()

    await prisma.finca.create({ data: { nombre: 'Santa Verónica' } })

    const VIGENTE = new Date('2000-01-01T00:00:00.000Z')
    for (const [clave, valor] of Object.entries({
      umbral_excelente: '900',
      umbral_bueno: '750',
      umbral_normal: '600',
      umbral_bajo: '400',
      gdp_objetivo: '750',
      peso_objetivo_venta_kg: '320',
      hectareas_utiles: '35',
    })) {
      await prisma.parametro.create({ data: { clave, valor, vigenteDesde: VIGENTE } })
    }

    for (const [nombre, correo] of [
      ['Joseph', 'joseph@ejemplo.com'],
      ['Amy', 'amy@ejemplo.com'],
    ]) {
      await prisma.usuario.create({
        data: { nombre, correo, claveHash: await bcrypt.hash('demo', 12) },
      })
    }
    const usuario = await prisma.usuario.findFirstOrThrow()

    const potreros = await Promise.all(
      [
        { nombre: 'La Loma', hectareas: 8, capacidadKg: 8000, tipoPasto: 'colosuana', tieneAgua: true },
        { nombre: 'Palo de Agua', hectareas: 10, capacidadKg: 10000, tipoPasto: 'guinea', tieneAgua: true },
        { nombre: 'El Mango', hectareas: 9.5, capacidadKg: 9000, tipoPasto: 'angleton', tieneAgua: true },
        { nombre: 'El Jobo', hectareas: 7.5, capacidadKg: 7000, tipoPasto: 'angleton', tieneAgua: false },
      ].map((datos) => prisma.potrero.create({ data: datos })),
    )
    const [laLoma, paloDeAgua, elMango] = potreros

    const ceba = await prisma.lote.create({
      data: {
        nombre: 'Ceba 01',
        tipo: 'ceba',
        fechaApertura: aFechaDb(ENTRADA),
        potreroActualId: laLoma.id,
        fechaEntradaPotrero: aFechaDb(sumarDias(HOY, -25)),
      },
    })
    await prisma.lote.create({
      data: {
        nombre: 'Leche',
        tipo: 'leche',
        fechaApertura: aFechaDb(sumarDias(HOY, -300)),
        potreroActualId: paloDeAgua.id,
        fechaEntradaPotrero: aFechaDb(sumarDias(HOY, -17)),
      },
    })

    // El lote pasó por El Mango antes de La Loma.
    await prisma.movimiento.create({
      data: {
        loteId: ceba.id,
        potreroDestinoId: elMango.id,
        fecha: aFechaDb(sumarDias(HOY, -100)),
        registradoPorId: usuario.id,
      },
    })
    await prisma.movimiento.create({
      data: {
        loteId: ceba.id,
        potreroOrigenId: elMango.id,
        potreroDestinoId: laLoma.id,
        fecha: aFechaDb(sumarDias(HOY, -25)),
        registradoPorId: usuario.id,
      },
    })

    // Catorce novillos con pesos de entrada distintos: un lote real no entra
    // parejo, y con todos iguales la rejilla no enseña nada.
    const entradas = [152, 148, 155, 150, 158, 145, 151, 149, 156, 147, 153, 150, 144, 157]
    const animales = []
    for (let i = 0; i < entradas.length; i++) {
      animales.push(
        await prisma.animal.create({
          data: {
            chapeta: String(i + 1).padStart(3, '0'),
            loteId: ceba.id,
            sexo: 'macho',
            raza: i % 3 === 0 ? 'Brangus' : 'Brahman',
            proveedor: 'Hacienda El Porvenir',
            fechaEntrada: aFechaDb(ENTRADA),
            edadEntradaMeses: 14,
            pesoEntradaKg: entradas[i],
          },
        }),
      )
    }

    // Tres tandas. En la última faltan cuatro: es el caso que la gráfica tiene
    // que saber avisar al pie.
    const tandas: { dias: number; cubre: number; ganancia: number }[] = [
      { dias: -75, cubre: 14, ganancia: 0.72 },
      { dias: -45, cubre: 14, ganancia: 0.78 },
      { dias: -12, cubre: 10, ganancia: 0.8 },
    ]
    for (const tanda of tandas) {
      const fecha = sumarDias(HOY, tanda.dias)
      const diasDesdeEntrada = 112 + tanda.dias
      await prisma.pesaje.create({
        data: {
          fecha: aFechaDb(fecha),
          metodo: 'cinta',
          responsable: 'Joseph',
          registradoPorId: usuario.id,
          mediciones: {
            create: animales.slice(0, tanda.cubre).map((animal, i) => {
              // Cuatro vienen quedados a propósito: 250 g/día contra el umbral
              // bajo de 400. Son los que la portada tiene que señalar.
              const gdp = i < 4 ? 0.25 : tanda.ganancia + (i % 5) * 0.03
              return {
                animalId: animal.id,
                pesoKg: Math.round((entradas[i] + gdp * diasDesdeEntrada) * 10) / 10,
              }
            }),
          },
        },
      })
    }

    // Una desparasitación ya vencida (la portada la avisa) y una vacunación
    // todavía vigente.
    await prisma.eventoSanitario.createMany({
      data: animales.map((animal) => ({
        tipo: 'desparasitacion' as const,
        fecha: aFechaDb(sumarDias(HOY, -104)),
        producto: 'Ivermectina 1%',
        dosis: '1 ml / 50 kg',
        responsable: 'Joseph',
        proximaFecha: aFechaDb(sumarDias(HOY, -12)),
        animalId: animal.id,
        loteId: ceba.id,
        registradoPorId: usuario.id,
      })),
    })
    await prisma.eventoSanitario.createMany({
      data: animales.map((animal) => ({
        tipo: 'vacuna' as const,
        fecha: aFechaDb(sumarDias(HOY, -90)),
        producto: 'Aftosa',
        dosis: '2 ml',
        responsable: 'ICA',
        proximaFecha: aFechaDb(sumarDias(HOY, 90)),
        animalId: animal.id,
        loteId: ceba.id,
        registradoPorId: usuario.id,
      })),
    })

    await prisma.novedad.create({
      data: {
        tipo: 'suministro',
        descripcion: 'sal mineralizada a voluntad',
        fecha: aFechaDb(sumarDias(HOY, -18)),
        loteId: ceba.id,
        registradoPorId: usuario.id,
      },
    })
    await prisma.novedad.create({
      data: {
        tipo: 'hecho',
        descripcion: 'Se arregló el bebedero de El Jobo',
        fecha: aFechaDb(sumarDias(HOY, -30)),
        potreroId: potreros[3].id,
        registradoPorId: usuario.id,
      },
    })

    console.log('Finca de demostración sembrada.')
    console.log('Entra con joseph@ejemplo.com y la clave "demo".')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
