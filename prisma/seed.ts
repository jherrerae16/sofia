import 'dotenv/config'
import { prisma } from '../src/datos/cliente'

// Tiene que ser una fecha ya pasada, nunca futura: `leerUmbrales` exige un
// parámetro vigente en la fecha de hoy, y con una vigencia en el futuro la
// finca recién creada arrancaría sin criterios configurados hasta que llegara
// esa fecha, y ninguna pantalla podría decir quién va quedado.
const VIGENTE_DESDE = new Date('2026-01-01T00:00:00.000Z')

/** Valores de arranque, todos editables desde Configuración. Ninguno es una constante del sistema. */
const PARAMETROS: Record<string, string> = {
  gdp_objetivo: '750',
  peso_objetivo_venta_kg: '320',
  // 30 ha útiles: la cifra de la reproyección del 1-sep-2026 (antes 35).
  hectareas_utiles: '30',
}

/**
 * Corre en cada despliegue de Vercel (`vercel-build`), así que solo siembra
 * una base vacía: si ya hay finca o parámetros, no toca nada. Lo que el
 * dueño cambie en Criterios nunca se pisa con los valores de arranque.
 */
async function main() {
  if ((await prisma.finca.count()) === 0) {
    await prisma.finca.create({ data: { nombre: 'Santa Verónica' } })
    console.log('Semilla: finca creada.')
  }

  if ((await prisma.parametro.count()) === 0) {
    for (const [clave, valor] of Object.entries(PARAMETROS)) {
      await prisma.parametro.create({ data: { clave, valor, vigenteDesde: VIGENTE_DESDE } })
    }
    console.log('Semilla: parámetros de arranque creados.')
  }
}

main().finally(() => prisma.$disconnect())
