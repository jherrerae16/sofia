import { beforeEach, describe, expect, it } from 'vitest'
import { crearAnimales, listarAnimalesDeLote } from './animales'
import { prisma } from './cliente'
import { crearLote } from './lotes'
import { eventosDeAnimal, eventosVencidos, registrarEvento } from './sanidad'

let loteId: string
let animalId: string

beforeEach(async () => {
  // Además de lo que pide el brief, se limpian movimiento y medicion: son
  // relaciones existentes hacia lote/animal, y sin borrarlas primero el
  // deleteMany de lote de más abajo choca con las filas que deja
  // movimientos.test.ts al correr toda la suite en el mismo orden.
  await prisma.eventoSanitario.deleteMany()
  await prisma.movimiento.deleteMany()
  await prisma.medicion.deleteMany()
  await prisma.animal.deleteMany()
  await prisma.lote.deleteMany()

  loteId = await crearLote({ nombre: 'Ceba 01', tipo: 'ceba', fechaApertura: '2026-09-01' })
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
  animalId = (await listarAnimalesDeLote(loteId))[0].id
})

describe('registrarEvento', () => {
  it('registra una desparasitación de un animal', async () => {
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-05',
      producto: 'Ivermectina',
      dosis: '1 ml / 50 kg',
      responsable: 'Joseph',
      proximaFecha: '2026-12-05',
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    const eventos = await eventosDeAnimal(animalId)
    expect(eventos).toHaveLength(1)
    expect(eventos[0].producto).toBe('Ivermectina')
    expect(eventos[0].proximaFecha).toBe('2026-12-05')
  })

  it('registra una vacunación de lote completo', async () => {
    await registrarEvento({
      tipo: 'vacuna',
      fecha: '2026-09-05',
      producto: 'Aftosa',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: '2027-03-05',
      notas: null,
      animalId: null,
      loteId,
      registradoPorId: 'u1',
    })

    expect(await prisma.eventoSanitario.count({ where: { loteId } })).toBe(1)
  })

  it('rechaza un evento que no apunta ni a un animal ni a un lote', async () => {
    await expect(
      registrarEvento({
        tipo: 'vacuna',
        fecha: '2026-09-05',
        producto: 'Aftosa',
        dosis: null,
        responsable: 'Joseph',
        proximaFecha: null,
        notas: null,
        animalId: null,
        loteId: null,
        registradoPorId: 'u1',
      }),
    ).rejects.toThrow('animal o a un lote')
  })
})

describe('eventosVencidos', () => {
  it('devuelve los eventos cuya próxima fecha ya pasó', async () => {
    await registrarEvento({
      tipo: 'desparasitacion',
      fecha: '2026-09-05',
      producto: 'Ivermectina',
      dosis: null,
      responsable: 'Joseph',
      proximaFecha: '2026-12-05',
      notas: null,
      animalId,
      loteId: null,
      registradoPorId: 'u1',
    })

    expect(await eventosVencidos('2026-12-01')).toHaveLength(0)
    expect(await eventosVencidos('2026-12-06')).toHaveLength(1)
  })
})
