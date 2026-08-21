import 'dotenv/config'
import { prisma } from '../src/datos/cliente'

const VIGENTE_DESDE = new Date('2026-09-01T00:00:00.000Z')

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
