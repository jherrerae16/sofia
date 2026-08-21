import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const global_ = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 eliminó el motor Rust integrado: sin adaptador de driver,
// `new PrismaClient()` falla en tiempo de ejecución con
// "A driver adapter is required to connect to your database."
const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = global_.prisma ?? new PrismaClient({ adapter: adaptador })

if (process.env.NODE_ENV !== 'production') global_.prisma = prisma
