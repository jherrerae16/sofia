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
  hectareas_utiles: '35',
}

async function main() {
  await prisma.finca.create({
    data: { nombre: 'Santa Verónica' },
  })

  for (const [clave, valor] of Object.entries(PARAMETROS)) {
    await prisma.parametro.create({ data: { clave, valor, vigenteDesde: VIGENTE_DESDE } })
  }
}

main().finally(() => prisma.$disconnect())
