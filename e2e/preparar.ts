import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/datos/cliente'

async function main() {
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
    data: { nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: new Date('2026-09-01T00:00:00.000Z') },
  })

  for (const chapeta of ['001', '002']) {
    await prisma.animal.create({
      data: {
        chapeta,
        loteId: lote.id,
        sexo: 'macho',
        raza: 'Brahman',
        fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
        pesoEntradaKg: 150,
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
