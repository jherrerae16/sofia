import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { limpiarTablasOperativas } from './limpieza-pruebas'
import { crearLote } from './lotes'
import {
  anularNovedad,
  cerrarSuministro,
  listarHistoria,
  listarSuministrosVigentes,
  registrarHecho,
  registrarSuministro,
} from './novedades'
import { crearPotrero } from './potreros'

let loteId: string
let otroLoteId: string
let potreroId: string

beforeEach(async () => {
  await limpiarTablasOperativas()
  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-08-01' })
  otroLoteId = await crearLote({ nombre: 'Ceba 02', tipo: 'ceba', fechaApertura: '2026-08-01' })
  potreroId = await crearPotrero({
    nombre: 'El Jobo',
    hectareas: 5,
    capacidadKg: 5000,
    tipoPasto: null,
    tieneAgua: true,
  })
})

describe('registrarHecho', () => {
  it('crea un hecho puntual con fecha y descripción, lote y potrero opcionales', async () => {
    const id = await registrarHecho(
      {
        fecha: '2026-08-12',
        descripcion: 'Se arregló el bebedero del Jobo',
        loteId: null,
        potreroId,
        registradoPorId: 'u1',
      },
      '2026-08-20',
    )

    const guardado = await prisma.novedad.findUniqueOrThrow({ where: { id } })
    expect(guardado.tipo).toBe('hecho')
    expect(guardado.descripcion).toBe('Se arregló el bebedero del Jobo')
    expect(guardado.loteId).toBeNull()
    expect(guardado.potreroId).toBe(potreroId)
    expect(guardado.registradoPorId).toBe('u1')
    expect(guardado.fechaFin).toBeNull()
  })

  it('permite un hecho sin lote ni potrero', async () => {
    await expect(
      registrarHecho(
        { fecha: '2026-08-12', descripcion: 'Se compró un bulto de sal', loteId: null, potreroId: null, registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).resolves.toBeTruthy()
  })

  it('rechaza una descripción vacía', async () => {
    await expect(
      registrarHecho(
        { fecha: '2026-08-12', descripcion: '   ', loteId: null, potreroId: null, registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).rejects.toThrow(/descripción/)
  })

  it('rechaza una fecha posterior a hoy', async () => {
    await expect(
      registrarHecho(
        { fecha: '2026-08-21', descripcion: 'Algo', loteId: null, potreroId: null, registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).rejects.toThrow(/posterior a hoy/)
  })
})

describe('registrarSuministro', () => {
  it('crea un suministro vigente (sin fecha de fin) para un lote', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )

    const guardado = await prisma.novedad.findUniqueOrThrow({ where: { id } })
    expect(guardado.tipo).toBe('suministro')
    expect(guardado.loteId).toBe(loteId)
    expect(guardado.fechaFin).toBeNull()
  })

  it('rechaza un suministro sin lote', async () => {
    await expect(
      registrarSuministro(
        { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId: '', registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).rejects.toThrow(/lote/)
  })

  it('rechaza una descripción vacía', async () => {
    await expect(
      registrarSuministro(
        { fechaInicio: '2026-08-05', descripcion: '', loteId, registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).rejects.toThrow(/descripción/)
  })

  it('rechaza una fecha de inicio posterior a hoy', async () => {
    await expect(
      registrarSuministro(
        { fechaInicio: '2026-08-21', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
        '2026-08-20',
      ),
    ).rejects.toThrow(/posterior a hoy/)
  })
})

describe('listarSuministrosVigentes', () => {
  it('responde "qué está recibiendo este lote ahora mismo"', async () => {
    await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await registrarSuministro(
      { fechaInicio: '2026-08-10', descripcion: 'Melaza en el comedero', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    // De otro lote: no debe aparecer.
    await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId: otroLoteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    // Un hecho puntual no es un suministro: no debe aparecer aunque sea del mismo lote.
    await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se arregló la cerca', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )

    const vigentes = await listarSuministrosVigentes(loteId)
    expect(vigentes).toHaveLength(2)
    expect(vigentes.map((v) => v.descripcion).sort()).toEqual(['Melaza en el comedero', 'Sal a voluntad'])
    expect(vigentes.every((v) => v.tipo === 'suministro')).toBe(true)
    expect(vigentes.every((v) => v.fechaFin === null)).toBe(true)
  })

  it('un suministro cerrado deja de estar vigente', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await cerrarSuministro(id, '2026-08-18', '2026-08-20')

    expect(await listarSuministrosVigentes(loteId)).toHaveLength(0)
  })

  it('un suministro anulado deja de estar vigente', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await anularNovedad(id, 'Se digitó en el lote equivocado', 'u1')

    expect(await listarSuministrosVigentes(loteId)).toHaveLength(0)
  })
})

describe('cerrarSuministro', () => {
  it('pone la fecha de fin', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await cerrarSuministro(id, '2026-08-18', '2026-08-20')

    const guardado = await prisma.novedad.findUniqueOrThrow({ where: { id } })
    expect(guardado.fechaFin?.toISOString().slice(0, 10)).toBe('2026-08-18')
  })

  it('rechaza una fecha de cierre anterior al inicio', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await expect(cerrarSuministro(id, '2026-08-01', '2026-08-20')).rejects.toThrow(/anterior/)
  })

  it('rechaza una fecha de cierre posterior a hoy', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await expect(cerrarSuministro(id, '2026-08-21', '2026-08-20')).rejects.toThrow(/posterior a hoy/)
  })

  it('rechaza cerrar un hecho puntual', async () => {
    const id = await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se arregló la cerca', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await expect(cerrarSuministro(id, '2026-08-18', '2026-08-20')).rejects.toThrow(/suministro/)
  })

  it('rechaza cerrar un suministro ya cerrado', async () => {
    const id = await registrarSuministro(
      { fechaInicio: '2026-08-05', descripcion: 'Sal a voluntad', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await cerrarSuministro(id, '2026-08-15', '2026-08-20')
    await expect(cerrarSuministro(id, '2026-08-18', '2026-08-20')).rejects.toThrow(/ya está cerrado/)
  })
})

describe('anularNovedad', () => {
  it('exige un motivo', async () => {
    const id = await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se arregló la cerca', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await expect(anularNovedad(id, '  ', 'u1')).rejects.toThrow(/motivo/)
  })

  it('marca anuladoEn, motivoAnulacion y anuladoPorId sin borrar el registro', async () => {
    const id = await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se arregló la cerca', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await anularNovedad(id, 'Se digitó dos veces', 'u2')

    const guardado = await prisma.novedad.findUniqueOrThrow({ where: { id } })
    expect(guardado.anuladoEn).not.toBeNull()
    expect(guardado.motivoAnulacion).toBe('Se digitó dos veces')
    expect(guardado.anuladoPorId).toBe('u2')
  })

  it('rechaza anular dos veces', async () => {
    const id = await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se arregló la cerca', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await anularNovedad(id, 'Motivo', 'u1')
    await expect(anularNovedad(id, 'Otro motivo', 'u1')).rejects.toThrow(/ya está anulada/)
  })
})

describe('listarHistoria', () => {
  it('responde "qué ha pasado en la finca", más reciente primero', async () => {
    await registrarHecho(
      { fecha: '2026-08-05', descripcion: 'Más vieja', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await registrarSuministro(
      { fechaInicio: '2026-08-15', descripcion: 'Más nueva', loteId, registradoPorId: 'u1' },
      '2026-08-20',
    )

    const historia = await listarHistoria()
    expect(historia.map((h) => h.descripcion)).toEqual(['Más nueva', 'Más vieja'])
  })

  it('incluye las novedades anuladas, con su motivo', async () => {
    const id = await registrarHecho(
      { fecha: '2026-08-12', descripcion: 'Se digitó mal', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await anularNovedad(id, 'Chapeta equivocada', 'u1')

    const historia = await listarHistoria()
    expect(historia).toHaveLength(1)
    expect(historia[0].anuladoEn).not.toBeNull()
    expect(historia[0].motivoAnulacion).toBe('Chapeta equivocada')
  })

  it('filtra por lote', async () => {
    await registrarHecho(
      { fecha: '2026-08-05', descripcion: 'Del lote 1', loteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )
    await registrarHecho(
      { fecha: '2026-08-06', descripcion: 'Del lote 2', loteId: otroLoteId, potreroId: null, registradoPorId: 'u1' },
      '2026-08-20',
    )

    const historia = await listarHistoria({ loteId })
    expect(historia).toHaveLength(1)
    expect(historia[0].descripcion).toBe('Del lote 1')
  })
})
