import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { frescura } from './frescura'
import { crearLote } from './lotes'
import { guardarPesaje } from './pesajes'

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.pesaje.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
})

describe('frescura', () => {
  it('reporta que no hay datos cuando la finca está vacía', async () => {
    const estado = await frescura('2026-10-01')
    expect(estado.ultimaFecha).toBeNull()
    expect(estado.diasSinDatos).toBeNull()
    expect(estado.alarmante).toBe(true)
  })

  it('cuenta los días desde el último pesaje', async () => {
    const loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId, pesoKg: 174 }],
      },
      '2026-10-01',
    )

    const reciente = await frescura('2026-10-10')
    expect(reciente.diasSinDatos).toBe(9)
    expect(reciente.alarmante).toBe(false)

    const viejo = await frescura('2026-11-20')
    expect(viejo.diasSinDatos).toBe(50)
    expect(viejo.alarmante).toBe(true)
  })

  it('marca el límite de los 30 días: hasta ahí no alarma, un día más sí', async () => {
    const loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId, pesoKg: 174 }],
      },
      '2026-10-01',
    )

    const enElLimite = await frescura('2026-10-31')
    expect(enElLimite.diasSinDatos).toBe(30)
    expect(enElLimite.alarmante).toBe(false)

    const pasadoElLimite = await frescura('2026-11-01')
    expect(pasadoElLimite.diasSinDatos).toBe(31)
    expect(pasadoElLimite.alarmante).toBe(true)
  })

  it('marca como alarmante un pesaje con fecha futura, aunque haya "datos"', async () => {
    // validarMedicion ya rechaza una fecha futura al digitar, pero un registro
    // que quedó guardado antes de ese arreglo (o insertado por fuera de la
    // aplicación) no debe apagar la alarma escondiéndose detrás de un
    // "hace -320 días" que nadie lee como una alarma real.
    const loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: null,
      pesos: { '001': 150 },
    })
    const animalId = (await listarAnimalesDeLote(loteId))[0].id

    // Se inserta directo por Prisma (no por guardarPesaje) porque el fin de
    // esta prueba es simular un dato futuro que ya quedó en la base, no
    // volver a probar el rechazo al digitar.
    await prisma.pesaje.create({
      data: {
        fecha: new Date('2027-10-01T00:00:00.000Z'),
        metodo: 'cinta',
        responsable: 'Joseph',
        registradoPorId: 'u1',
        mediciones: { create: [{ animalId, pesoKg: 210 }] },
      },
    })

    // A mano: diasEntre('2027-10-01', '2026-11-15') = -(365 - 45) = -320
    // (365 días entre 2026-11-15 y 2027-11-15; 45 días de 2027-10-01 a esa fecha).
    const estado = await frescura('2026-11-15')
    expect(estado.diasSinDatos).toBe(-320)
    expect(estado.alarmante).toBe(true)
  })
})
