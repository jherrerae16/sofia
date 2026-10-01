import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { anularGasto, listarGastosDelMes, listarTotalesPorMes, registrarGasto } from './gastos'

beforeEach(async () => {
  await prisma.gasto.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.usuario.createMany({
    data: [
      { id: 'u1', nombre: 'Joseph', usuario: 'jvargas' },
      { id: 'u2', nombre: 'Juan David', usuario: 'jherrera' },
    ],
  })
})

const HOY = '2026-10-01'

describe('registrarGasto', () => {
  it('guarda fecha, descripción sin espacios sobrantes, valor y quién lo anotó', async () => {
    const id = await registrarGasto(
      { fecha: '2026-09-28', descripcion: '  Recibo de luz de septiembre ', valor: 312_400, registradoPorId: 'u2' },
      HOY,
    )
    const gasto = await prisma.gasto.findUniqueOrThrow({ where: { id } })
    expect(gasto.descripcion).toBe('Recibo de luz de septiembre')
    expect(gasto.valor).toBe(312_400)
    expect(gasto.registradoPorId).toBe('u2')
  })

  it('rechaza un gasto sin descripción', async () => {
    await expect(
      registrarGasto({ fecha: HOY, descripcion: '   ', valor: 1000, registradoPorId: 'u1' }, HOY),
    ).rejects.toThrow('qué fue')
  })

  it('rechaza un valor en cero, negativo o con decimales', async () => {
    for (const valor of [0, -5000, 12.5]) {
      await expect(
        registrarGasto({ fecha: HOY, descripcion: 'Sal', valor, registradoPorId: 'u1' }, HOY),
      ).rejects.toThrow('valor')
    }
  })

  it('rechaza una fecha posterior a hoy', async () => {
    await expect(
      registrarGasto({ fecha: '2026-10-02', descripcion: 'Sal', valor: 1000, registradoPorId: 'u1' }, HOY),
    ).rejects.toThrow('posterior a hoy')
  })
})

describe('listarGastosDelMes', () => {
  it('trae solo ese mes, el más reciente primero, con el nombre de quien lo anotó', async () => {
    await registrarGasto({ fecha: '2026-09-04', descripcion: 'Bebedero', valor: 85_000, registradoPorId: 'u1' }, HOY)
    await registrarGasto({ fecha: '2026-09-30', descripcion: 'Sueldo', valor: 2_800_000, registradoPorId: 'u2' }, HOY)
    await registrarGasto({ fecha: '2026-10-01', descripcion: 'Gasolina', valor: 95_000, registradoPorId: 'u1' }, HOY)

    const gastos = await listarGastosDelMes('2026-09')
    expect(gastos.map((g) => [g.fecha, g.descripcion, g.anotadoPor])).toEqual([
      ['2026-09-30', 'Sueldo', 'Juan David'],
      ['2026-09-04', 'Bebedero', 'Joseph'],
    ])
  })
})

describe('anularGasto', () => {
  it('no lo borra: queda con su motivo y deja de sumar en el total del mes', async () => {
    const bueno = await registrarGasto({ fecha: '2026-09-15', descripcion: 'Peajes', valor: 240_000, registradoPorId: 'u1' }, HOY)
    const repetido = await registrarGasto({ fecha: '2026-09-15', descripcion: 'Peajes', valor: 240_000, registradoPorId: 'u1' }, HOY)

    await anularGasto(repetido, '  Repetido ', 'u2')

    const gastos = await listarGastosDelMes('2026-09')
    expect(gastos).toHaveLength(2)
    const anulado = gastos.find((g) => g.id === repetido)
    expect(anulado?.anulado).toBe(true)
    expect(anulado?.motivoAnulacion).toBe('Repetido')
    expect(gastos.find((g) => g.id === bueno)?.anulado).toBe(false)

    expect(await listarTotalesPorMes(HOY)).toEqual([
      { mes: '2026-10', total: 0, gastos: 0 },
      { mes: '2026-09', total: 240_000, gastos: 1 },
    ])
  })

  it('exige motivo y no anula dos veces', async () => {
    const id = await registrarGasto({ fecha: HOY, descripcion: 'Sal', valor: 1000, registradoPorId: 'u1' }, HOY)
    await expect(anularGasto(id, ' ', 'u1')).rejects.toThrow('motivo')
    await anularGasto(id, 'Equivocado', 'u1')
    await expect(anularGasto(id, 'Otra vez', 'u1')).rejects.toThrow('ya está anulado')
    await expect(anularGasto('no-existe', 'X', 'u1')).rejects.toThrow('no existe')
  })
})
