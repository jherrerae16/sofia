import 'dotenv/config'
import { prisma } from '../src/datos/cliente'

// Tiene que ser una fecha ya pasada, nunca futura: `leerUmbrales` exige un
// parámetro vigente en la fecha de hoy, y con una vigencia en el futuro la
// finca recién creada arrancaría sin umbrales configurados hasta que
// llegara esa fecha. "Cómo vamos" (y la portada, que enlaza justo ahí)
// se rompía el primer día por esto.
const VIGENTE_DESDE = new Date('2026-01-01T00:00:00.000Z')

/** Valores de arranque, todos editables desde Configuración. Ninguno es una constante del sistema. */
const PARAMETROS: Record<string, string> = {
  umbral_excelente: '900',
  umbral_bueno: '750',
  umbral_normal: '600',
  umbral_bajo: '400',
  gdp_objetivo: '750',
  peso_objetivo_venta_kg: '320',
}

async function main() {
  await prisma.finca.create({
    data: { nombre: 'Santa Verónica', hectareasUtiles: 35 },
  })

  for (const [clave, valor] of Object.entries(PARAMETROS)) {
    await prisma.parametro.create({ data: { clave, valor, vigenteDesde: VIGENTE_DESDE } })
  }
}

main().finally(() => prisma.$disconnect())
