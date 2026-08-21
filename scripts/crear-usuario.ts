import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/datos/cliente'

const [nombre, correo, clave] = process.argv.slice(2)

if (!nombre || !correo || !clave) {
  console.error('Uso: npx tsx scripts/crear-usuario.ts "Nombre" correo@ejemplo.com clave')
  process.exit(1)
}

async function main() {
  await prisma.usuario.create({
    data: {
      nombre,
      correo: correo.toLowerCase().trim(),
      claveHash: await bcrypt.hash(clave, 12),
    },
  })
  console.log(`Usuario ${correo} creado.`)
}

main().finally(() => prisma.$disconnect())
