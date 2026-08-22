import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote, registrarSalida } from './animales'
import { prisma } from './cliente'
import { aKg } from './conversion'
import { crearLote } from './lotes'

let loteId: string

beforeEach(async () => {
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()
  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
})

describe('crearAnimales', () => {
  it('crea un animal por chapeta con su peso de entrada', async () => {
    const creados = await crearAnimales({
      loteId,
      chapetas: ['001', '002'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: 'Feria Sabanalarga',
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '001': 150, '002': 158.5 },
    })

    expect(creados).toBe(2)
    const animales = await listarAnimalesDeLote(loteId)
    expect(animales).toHaveLength(2)
    expect(animales[0].chapeta).toBe('001')
    expect(animales[0].pesoEntradaKg).toBe(150)
    expect(animales[1].pesoEntradaKg).toBe(158.5)
    expect(animales[0].estado).toBe('activo')
  })

  it('rechaza una chapeta repetida en la finca', async () => {
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

    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-02',
        edadEntradaMeses: null,
        pesos: { '001': 152 },
      }),
    ).rejects.toThrow()
  })

  it('rechaza una chapeta sin peso de entrada', async () => {
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '002'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150 },
      }),
    ).rejects.toThrow('002')
  })

  it('rechaza un peso de entrada no numérico', async () => {
    // El formulario de alta manda el peso ya convertido con `Number(texto)`:
    // un texto no numérico (p. ej. "15o" en vez de "150", el mismo dedazo
    // clásico de la "o" por el "0") llega aquí como NaN, no como
    // `undefined`. `NaN <= 0` es `false`, así que sin esta guardia colaba
    // hasta Prisma y el ganadero veía una pantalla de error genérica sin
    // saber qué línea de la planilla corregir. Es la misma guardia que ya
    // existe en `validarMedicion` para el mismo error.
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '002'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150, '002': NaN },
      }),
    ).rejects.toThrow('002')

    expect(await listarAnimalesDeLote(loteId)).toHaveLength(0)
  })

  it('no crea ningún animal si uno falla', async () => {
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '002'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150, '002': 0 },
      }),
    ).rejects.toThrow()

    expect(await listarAnimalesDeLote(loteId)).toHaveLength(0)
  })

  it('revierte los animales ya creados si uno falla en la base de datos', async () => {
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

    // La chapeta nueva va ANTES que la repetida en el arreglo: así la validación
    // previa (que solo revisa pesos) deja pasar la llamada completa y el fallo
    // ocurre de verdad en la base, por la restricción de unicidad de la chapeta,
    // después de que Prisma ya intentó crear '002' dentro de la misma transacción.
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['002', '001'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-02',
        edadEntradaMeses: null,
        pesos: { '001': 152, '002': 160 },
      }),
    ).rejects.toThrow()

    const animales = await listarAnimalesDeLote(loteId)
    expect(animales).toHaveLength(1)
    expect(animales[0].chapeta).toBe('001')
    expect(animales[0].pesoEntradaKg).toBe(150)
  })
})

describe('registrarSalida', () => {
  beforeEach(async () => {
    await crearAnimales({
      loteId,
      chapetas: ['001', '002'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '001': 150, '002': 150 },
    })
  })

  it('registra la venta de varios animales a la vez, con su peso de venta', async () => {
    const animales = await listarAnimalesDeLote(loteId)
    const [a001, a002] = animales

    const cuantos = await registrarSalida(
      {
        animalIds: [a001.id, a002.id],
        estado: 'vendido',
        fechaSalida: '2026-09-10',
        motivoSalida: null,
        pesosSalida: { [a001.id]: 220, [a002.id]: 215.5 },
      },
      '2026-09-10',
    )

    expect(cuantos).toBe(2)
    const guardado001 = await prisma.animal.findUniqueOrThrow({ where: { id: a001.id } })
    expect(guardado001.estado).toBe('vendido')
    expect(guardado001.fechaSalida?.toISOString().slice(0, 10)).toBe('2026-09-10')
    expect(guardado001.motivoSalida).toBeNull()
    expect(aKg(guardado001.pesoSalidaKg!)).toBe(220)
    const guardado002 = await prisma.animal.findUniqueOrThrow({ where: { id: a002.id } })
    expect(aKg(guardado002.pesoSalidaKg!)).toBe(215.5)
  })

  it('acepta una venta sin motivo', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-09-10',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).resolves.toBe(1)
  })

  it('exige un motivo para registrar una muerte', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'muerto',
          fechaSalida: '2026-09-10',
          motivoSalida: '  ',
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow(/motivo/i)
  })

  it('exige un motivo para registrar un robo', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'robado',
          fechaSalida: '2026-09-10',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow(/motivo/i)
  })

  it('guarda el motivo de muerte o robo cuando sí se da', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await registrarSalida(
      {
        animalIds: [animal.id],
        estado: 'muerto',
        fechaSalida: '2026-09-10',
        motivoSalida: 'Neumonía, no respondió al tratamiento',
        pesosSalida: {},
      },
      '2026-09-10',
    )
    const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })
    expect(guardado.motivoSalida).toBe('Neumonía, no respondió al tratamiento')
    expect(guardado.pesoSalidaKg).toBeNull()
  })

  it('rechaza una fecha de salida anterior a la entrada del animal', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-08-31',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow('001')
  })

  it('rechaza una fecha de salida posterior a hoy', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-09-11',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow()
  })

  it('rechaza un animal que ya salió', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await registrarSalida(
      {
        animalIds: [animal.id],
        estado: 'vendido',
        fechaSalida: '2026-09-05',
        motivoSalida: null,
        pesosSalida: {},
      },
      '2026-09-10',
    )
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'muerto',
          fechaSalida: '2026-09-10',
          motivoSalida: 'no debería aplicar',
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow('001')
  })

  it('no registra ninguna salida de la tanda si un animal ya salió', async () => {
    const animales = await listarAnimalesDeLote(loteId)
    const [a001, a002] = animales
    await registrarSalida(
      {
        animalIds: [a001.id],
        estado: 'vendido',
        fechaSalida: '2026-09-05',
        motivoSalida: null,
        pesosSalida: {},
      },
      '2026-09-10',
    )

    await expect(
      registrarSalida(
        {
          animalIds: [a001.id, a002.id],
          estado: 'vendido',
          fechaSalida: '2026-09-10',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow()

    const guardado002 = await prisma.animal.findUniqueOrThrow({ where: { id: a002.id } })
    expect(guardado002.estado).toBe('activo')
  })

  it('rechaza un peso de venta no numérico', async () => {
    const [animal] = await listarAnimalesDeLote(loteId)
    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-09-10',
          motivoSalida: null,
          pesosSalida: { [animal.id]: Number('22o') },
        },
        '2026-09-10',
      ),
    ).rejects.toThrow('001')
  })

  it('rechaza ningún animal seleccionado', async () => {
    await expect(
      registrarSalida(
        { animalIds: [], estado: 'vendido', fechaSalida: '2026-09-10', motivoSalida: null, pesosSalida: {} },
        '2026-09-10',
      ),
    ).rejects.toThrow()
  })
})
