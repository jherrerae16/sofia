import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
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
