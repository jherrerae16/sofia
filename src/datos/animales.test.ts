import { beforeEach, describe, expect, it } from 'vitest'
import {
  ChapetaDuplicadaError,
  crearAnimales,
  listarAnimalesDeLote,
  PesoSalidaSospechosoError,
  registrarSalida,
  type EstadoSalida,
} from './animales'
import { prisma } from './cliente'
import { aKg } from './conversion'
import { crearLote } from './lotes'
import { guardarPesaje } from './pesajes'

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

  it('rechaza una chapeta que ya está activa', async () => {
    // Válida solo entre animales ACTIVOS -- no en toda la historia de la
    // finca. Este caso (una 001 activa, sin haber salido) es el que sí debe
    // rechazarse; el de "salió y se reutiliza" tiene su propia prueba abajo.
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

  it('detalla en qué lote está la chapeta activa, desde cuándo y su último peso', async () => {
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
    const [activo] = await listarAnimalesDeLote(loteId)
    await guardarPesaje(
      {
        fecha: '2026-10-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: activo.id, pesoKg: 180 }],
      },
      '2026-10-01',
    )

    const otroLoteId = await crearLote({ nombre: 'Ceba 02', tipo: 'ceba', fechaApertura: '2026-10-05' })

    let error: unknown
    try {
      await crearAnimales({
        loteId: otroLoteId,
        chapetas: ['001'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-10-05',
        edadEntradaMeses: null,
        pesos: { '001': 155 },
      })
    } catch (e) {
      error = e
    }

    expect(error).toBeInstanceOf(ChapetaDuplicadaError)
    const conflictos = (error as ChapetaDuplicadaError).conflictos
    expect(conflictos).toHaveLength(1)
    expect(conflictos[0]).toMatchObject({
      chapeta: '001',
      loteNombre: 'Ceba 01',
      fechaEntrada: '2026-09-01',
      pesoUltimoKg: 180,
    })
    // Ningún animal nuevo se creó en el lote destino: el alta se rechaza
    // entera, no a medias.
    expect(await listarAnimalesDeLote(otroLoteId)).toHaveLength(0)
  })

  it('permite reutilizar una chapeta que quedó libre porque el animal salió', async () => {
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
    const [vendido] = await listarAnimalesDeLote(loteId)
    await registrarSalida(
      {
        animalIds: [vendido.id],
        estado: 'vendido',
        fechaSalida: '2026-10-01',
        motivoSalida: null,
        pesosSalida: {},
      },
      '2026-10-01',
    )

    const loteMarzo = await crearLote({ nombre: 'Ceba marzo', tipo: 'ceba', fechaApertura: '2027-03-01' })
    const creados = await crearAnimales({
      loteId: loteMarzo,
      chapetas: ['001'],
      sexo: 'macho',
      raza: null,
      cruce: null,
      proveedor: null,
      fechaEntrada: '2027-03-01',
      edadEntradaMeses: null,
      pesos: { '001': 145 },
    })

    expect(creados).toBe(1)
    const nuevos = await listarAnimalesDeLote(loteMarzo)
    expect(nuevos).toHaveLength(1)
    expect(nuevos[0].chapeta).toBe('001')
    expect(nuevos[0].estado).toBe('activo')

    // Las dos chapetas '001' coexisten: la vendida (histórica) y la activa.
    const todas = await prisma.animal.findMany({ where: { chapeta: '001' } })
    expect(todas).toHaveLength(2)
    expect(todas.filter((a) => a.estado === 'activo')).toHaveLength(1)
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
    // La misma chapeta escrita dos veces en la planilla por un dedazo real:
    // la comprobación previa (que solo mira chapetas YA existentes en la
    // base) no ve nada raro porque ninguna '001' existe todavía -- dentro del
    // mismo lote no hay nada contra qué comparar. El fallo ocurre de verdad
    // en la base, por el índice único parcial, cuando la transacción intenta
    // crear la segunda '001' activa mientras la primera ya quedó creada
    // dentro de la misma transacción.
    await expect(
      crearAnimales({
        loteId,
        chapetas: ['001', '001'],
        sexo: 'macho',
        raza: null,
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-09-01',
        edadEntradaMeses: null,
        pesos: { '001': 150 },
      }),
    ).rejects.toThrow()

    expect(await listarAnimalesDeLote(loteId)).toHaveLength(0)
  })
})

describe('el índice único parcial (chapeta activa)', () => {
  // Estas dos pruebas escriben directamente con `prisma`, sin pasar por
  // `crearAnimales`: es a propósito, para demostrar que la garantía la
  // impone la base de datos y no la comprobación previa de la capa de
  // aplicación (que una prueba contra `crearAnimales` no podría distinguir
  // de una comprobación en memoria).
  it('la base de datos rechaza una segunda chapeta activa aunque nadie la comprobara antes', async () => {
    await prisma.animal.create({
      data: {
        chapeta: '777',
        loteId,
        sexo: 'macho',
        fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
        pesoEntradaKg: 150,
      },
    })

    await expect(
      prisma.animal.create({
        data: {
          chapeta: '777',
          loteId,
          sexo: 'macho',
          fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
          pesoEntradaKg: 150,
        },
      }),
    ).rejects.toThrow()
  })

  it('la base de datos permite dos chapetas iguales si la primera ya no está activa', async () => {
    await prisma.animal.create({
      data: {
        chapeta: '778',
        loteId,
        sexo: 'macho',
        fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
        pesoEntradaKg: 150,
        estado: 'vendido',
        fechaSalida: new Date('2026-09-10T00:00:00.000Z'),
      },
    })

    await expect(
      prisma.animal.create({
        data: {
          chapeta: '778',
          loteId,
          sexo: 'macho',
          fechaEntrada: new Date('2026-09-01T00:00:00.000Z'),
          pesoEntradaKg: 150,
        },
      }),
    ).resolves.toBeTruthy()
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

    // Fecha de salida a 61 días de la entrada (no los 9 días que usan las
    // demás pruebas de este describe): con la guardia de 2.1, ganar 70 kg en
    // solo 9 días dispararía la advertencia por ganancia diaria inverosímil
    // -- aquí la ganancia debe quedar dentro de lo creíble para que esta
    // prueba siga demostrando el camino feliz sin necesitar confirmación.
    const cuantos = await registrarSalida(
      {
        animalIds: [a001.id, a002.id],
        estado: 'vendido',
        fechaSalida: '2026-11-01',
        motivoSalida: null,
        pesosSalida: { [a001.id]: 220, [a002.id]: 215.5 },
      },
      '2026-11-01',
    )

    expect(cuantos).toBe(2)
    const guardado001 = await prisma.animal.findUniqueOrThrow({ where: { id: a001.id } })
    expect(guardado001.estado).toBe('vendido')
    expect(guardado001.fechaSalida?.toISOString().slice(0, 10)).toBe('2026-11-01')
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

describe('registrarSalida — vigilancia del peso de venta (hallazgo 2.1)', () => {
  beforeEach(async () => {
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '001': 150 },
    })
  })

  it('rechaza en silencio un dedazo -- 2200 kg en vez de 220 -- con una advertencia, no lo acepta directo', async () => {
    // El caso exacto del hallazgo: un animal que entró con 150 kg y "vendió"
    // con 2200 kg (un dígito de más sobre 220). Antes de esta guardia,
    // `registrarSalida` solo comprobaba que el peso fuera finito y mayor que
    // cero -- 2200 pasaba esa comprobación sin más y quedaba aceptado en
    // silencio.
    const [animal] = await listarAnimalesDeLote(loteId)

    let error: unknown
    try {
      await registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-11-01',
          motivoSalida: null,
          pesosSalida: { [animal.id]: 2200 },
        },
        '2026-11-01',
      )
    } catch (e) {
      error = e
    }

    expect(error).toBeInstanceOf(PesoSalidaSospechosoError)
    const advertencias = (error as PesoSalidaSospechosoError).advertencias
    expect(advertencias).toHaveLength(1)
    expect(advertencias[0].chapeta).toBe('001')
    expect(advertencias[0].mensaje).toMatch(/Ganancia de/)
    expect((error as Error).message).toMatch(/001/)

    // Nada se guardó: el animal sigue activo, sin fecha ni peso de salida --
    // ni a medias ni del todo. La advertencia frena la escritura hasta que
    // alguien la confirme, no la deja pasar y avisa después.
    const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })
    expect(guardado.estado).toBe('activo')
    expect(guardado.fechaSalida).toBeNull()
    expect(guardado.pesoSalidaKg).toBeNull()
  })

  it('registra el mismo dedazo si quien llama confirma explícitamente la advertencia', async () => {
    // La doctrina es "advierte lo improbable", no "bloquea lo improbable":
    // un animal puede de verdad haber engordado muchísimo, y el ganadero
    // tiene que poder confirmarlo. `confirmarPesosSospechosos` es cómo la
    // interfaz deja pasar la advertencia una vez que el usuario la vio y
    // decidió seguir.
    const [animal] = await listarAnimalesDeLote(loteId)

    const cuantos = await registrarSalida(
      {
        animalIds: [animal.id],
        estado: 'vendido',
        fechaSalida: '2026-11-01',
        motivoSalida: null,
        pesosSalida: { [animal.id]: 2200 },
        confirmarPesosSospechosos: true,
      },
      '2026-11-01',
    )

    expect(cuantos).toBe(1)
    const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })
    expect(guardado.estado).toBe('vendido')
    expect(aKg(guardado.pesoSalidaKg!)).toBe(2200)
  })

  it('no exige confirmación para una ganancia alta pero creíble', async () => {
    // 220 kg contra 150 kg de entrada en 61 días es una ganancia alta mas no
    // imposible -- no debe disparar ninguna advertencia ni pedir
    // confirmación, para no volver tedioso el caso normal.
    const [animal] = await listarAnimalesDeLote(loteId)

    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-11-01',
          motivoSalida: null,
          pesosSalida: { [animal.id]: 220 },
        },
        '2026-11-01',
      ),
    ).resolves.toBe(1)
  })

  it('rechaza (sin poder confirmarse) un peso de venta el mismo día de un pesaje ya guardado con otro valor', async () => {
    // La misma regla de "rechazo" que ya aplica a cualquier pesaje digitado
    // dos veces el mismo día -- ver `validarMedicion` en
    // src/calc/validacion.ts. Esto es lo imposible, no lo improbable: no
    // hay `confirmarPesosSospechosos` que lo deje pasar.
    const [animal] = await listarAnimalesDeLote(loteId)
    await guardarPesaje(
      {
        fecha: '2026-11-01',
        metodo: 'cinta',
        responsable: 'Joseph',
        notas: null,
        registradoPorId: 'u1',
        mediciones: [{ animalId: animal.id, pesoKg: 210 }],
      },
      '2026-11-01',
    )

    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-11-01',
          motivoSalida: null,
          pesosSalida: { [animal.id]: 300 },
          confirmarPesosSospechosos: true,
        },
        '2026-11-01',
      ),
    ).rejects.toThrow(/mismo día/)
  })

  it('traduce a español el desborde de la columna cuando el peso confirmado es absurdamente grande (hallazgo 2.3)', async () => {
    // 99999 kg desborda Decimal(5,1) (máximo 9999.9). Con la advertencia ya
    // confirmada, la escritura llega hasta Prisma y Postgres la rechaza con
    // "numeric field overflow" -- el error crudo que el hallazgo 2.3 pide
    // traducir, no mostrar tal cual con rutas de archivo y números de línea.
    const [animal] = await listarAnimalesDeLote(loteId)

    let error: unknown
    try {
      await registrarSalida(
        {
          animalIds: [animal.id],
          estado: 'vendido',
          fechaSalida: '2026-11-01',
          motivoSalida: null,
          pesosSalida: { [animal.id]: 99999 },
          confirmarPesosSospechosos: true,
        },
        '2026-11-01',
      )
    } catch (e) {
      error = e
    }

    expect(error).toBeInstanceOf(Error)
    const mensaje = (error as Error).message
    expect(mensaje).not.toMatch(/Invalid `prisma/)
    expect(mensaje).not.toMatch(/\.ts:\d+:\d+/)
    expect(mensaje).toMatch(/grande/)

    const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })
    expect(guardado.estado).toBe('activo')
  })
})

describe('registrarSalida — el estado contra una lista blanca (hallazgo 2.2)', () => {
  beforeEach(async () => {
    await crearAnimales({
      loteId,
      chapetas: ['001'],
      sexo: 'macho',
      raza: 'Brahman',
      cruce: null,
      proveedor: null,
      fechaEntrada: '2026-09-01',
      edadEntradaMeses: 14,
      pesos: { '001': 150 },
    })
  })

  it('rechaza un estado que no sea vendido, muerto o robado -- ni "activo" ni cualquier otro texto', async () => {
    // Solo alcanzable con una petición que no pase por el selector de tres
    // opciones del formulario -- pero `registrarSalida` no puede confiar en
    // que todo llamador futuro pase por ahí.
    const [animal] = await listarAnimalesDeLote(loteId)

    await expect(
      registrarSalida(
        {
          animalIds: [animal.id],
          // El cast es a propósito: simula una petición que no pasó por el
          // `<select>` de tres opciones, el único caso donde este valor es
          // alcanzable en la práctica.
          estado: 'activo' as EstadoSalida,
          fechaSalida: '2026-09-05',
          motivoSalida: null,
          pesosSalida: {},
        },
        '2026-09-10',
      ),
    ).rejects.toThrow(/vendido, muerto o robado/)

    const guardado = await prisma.animal.findUniqueOrThrow({ where: { id: animal.id } })
    expect(guardado.estado).toBe('activo')
    expect(guardado.fechaSalida).toBeNull()
  })
})
