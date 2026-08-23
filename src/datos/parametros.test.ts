import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { aFechaDb } from './conversion'
import {
  CLAVE_HECTAREAS_UTILES,
  configurarParametro,
  dejaSinVigenteHoy,
  estadoParametro,
  guardarParametro,
  historialParametro,
  leerGdpObjetivo,
  leerParametro,
  leerUmbrales,
  revisarCambioParametro,
} from './parametros'

beforeEach(async () => {
  await prisma.parametro.deleteMany()
})

describe('leerParametro', () => {
  it('devuelve el valor vigente en la fecha consultada', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    await guardarParametro('gdp_objetivo', '800', '2027-01-01', 'u1')

    expect(await leerParametro('gdp_objetivo', '2026-12-31')).toBe('750')
    expect(await leerParametro('gdp_objetivo', '2027-01-01')).toBe('800')
  })

  it('devuelve null antes de la primera vigencia', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    expect(await leerParametro('gdp_objetivo', '2026-08-01')).toBeNull()
  })

  it('devuelve null para una clave que no existe', async () => {
    expect(await leerParametro('inexistente', '2026-09-01')).toBeNull()
  })

  it('cuando dos valores comparten la fecha de vigencia, devuelve el creado más tarde', async () => {
    // Corregir un umbral mal escrito significa insertar una segunda fila con
    // la misma vigencia: la última corrección debe ganar, sin importar el
    // orden en que la base decida devolverlas si solo se ordenara por
    // vigencia. `creadoEn` se fija a mano (en vez de dejar el `now()` por
    // omisión de `guardarParametro`) para que el desempate no dependa de que
    // las dos inserciones caigan en milisegundos distintos del reloj real.
    await prisma.parametro.create({
      data: {
        clave: 'gdp_objetivo',
        valor: '750',
        vigenteDesde: aFechaDb('2026-09-01'),
        creadoPorId: 'u1',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      },
    })
    await prisma.parametro.create({
      data: {
        clave: 'gdp_objetivo',
        valor: '800',
        vigenteDesde: aFechaDb('2026-09-01'),
        creadoPorId: 'u1',
        creadoEn: new Date('2026-01-02T00:00:00.000Z'),
      },
    })

    expect(await leerParametro('gdp_objetivo', '2026-09-01')).toBe('800')
  })
})

describe('leerUmbrales', () => {
  it('arma los umbrales desde los parámetros guardados', async () => {
    await guardarParametro('umbral_excelente', '900', '2026-09-01', 'u1')
    await guardarParametro('umbral_bueno', '750', '2026-09-01', 'u1')
    await guardarParametro('umbral_normal', '600', '2026-09-01', 'u1')
    await guardarParametro('umbral_bajo', '400', '2026-09-01', 'u1')

    expect(await leerUmbrales('2026-10-01')).toEqual({
      excelente: 900,
      bueno: 750,
      normal: 600,
      bajo: 400,
    })
  })

  it('lanza un error si faltan umbrales, en lugar de inventarlos', async () => {
    await expect(leerUmbrales('2026-10-01')).rejects.toThrow('umbral_excelente')
  })

  it('lanza un error si un umbral guardado no es un número, en vez de clasificar todo como crítico', async () => {
    // Si esto no se validara, `Number('no-es-un-numero')` da NaN, la
    // comparación `gdp >= NaN` es siempre falsa, y clasificar caería siempre
    // en 'critico' sin que nadie se entere de que la causa es un dato mal
    // guardado, no el desempeño de los animales.
    await guardarParametro('umbral_excelente', 'no-es-un-numero', '2026-09-01', 'u1')
    await guardarParametro('umbral_bueno', '750', '2026-09-01', 'u1')
    await guardarParametro('umbral_normal', '600', '2026-09-01', 'u1')
    await guardarParametro('umbral_bajo', '400', '2026-09-01', 'u1')

    await expect(leerUmbrales('2026-10-01')).rejects.toThrow('umbral_excelente')
    await expect(leerUmbrales('2026-10-01')).rejects.toThrow(/número/)
  })
})

describe('leerGdpObjetivo', () => {
  it('devuelve el objetivo cuando está configurado', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    expect(await leerGdpObjetivo('2026-10-01')).toBe(750)
  })

  it('devuelve null cuando el parámetro no está configurado, en vez de inventar un cero', async () => {
    expect(await leerGdpObjetivo('2026-10-01')).toBeNull()
  })

  it('devuelve null cuando el valor guardado no es un número finito', async () => {
    await guardarParametro('gdp_objetivo', 'no-es-un-numero', '2026-09-01', 'u1')
    expect(await leerGdpObjetivo('2026-10-01')).toBeNull()
  })
})

describe('historialParametro', () => {
  it('devuelve los valores del más reciente al más antiguo', async () => {
    await guardarParametro('gdp_objetivo', '700', '2026-01-01', 'u1')
    await guardarParametro('gdp_objetivo', '750', '2026-09-01', 'u1')
    await guardarParametro('gdp_objetivo', '800', '2027-01-01', 'u1')

    const historial = await historialParametro('gdp_objetivo')
    expect(historial).toEqual([
      { valor: '800', vigenteDesde: '2027-01-01' },
      { valor: '750', vigenteDesde: '2026-09-01' },
      { valor: '700', vigenteDesde: '2026-01-01' },
    ])
  })

  it('devuelve una lista vacía para una clave sin configurar', async () => {
    expect(await historialParametro('gdp_objetivo')).toEqual([])
  })
})

describe('estadoParametro', () => {
  it('arma el valor vigente hoy junto con el histórico completo', async () => {
    await guardarParametro('gdp_objetivo', '700', '2026-01-01', 'u1')
    await guardarParametro('gdp_objetivo', '800', '2027-01-01', 'u1')

    const estado = await estadoParametro('gdp_objetivo', '2026-10-01')
    expect(estado.valorVigente).toBe('700')
    expect(estado.vigenteDesde).toBe('2026-01-01')
    expect(estado.historial).toHaveLength(2)
  })

  it('reporta sin valor vigente cuando la única vigencia es futura', async () => {
    await guardarParametro('gdp_objetivo', '800', '2027-01-01', 'u1')

    const estado = await estadoParametro('gdp_objetivo', '2026-10-01')
    expect(estado.valorVigente).toBeNull()
    expect(estado.vigenteDesde).toBeNull()
    expect(estado.historial).toHaveLength(1)
  })
})

describe('configurarParametro — rechaza lo que no sea un número', () => {
  it('rechaza un texto no numérico antes de guardarlo', async () => {
    await expect(configurarParametro('gdp_objetivo', 'ochocientos', '2026-09-01', 'u1')).rejects.toThrow(/número/)
    expect(await leerParametro('gdp_objetivo', '2026-09-01')).toBeNull()
  })

  it('acepta un número y lo guarda como el valor vigente', async () => {
    await configurarParametro('gdp_objetivo', '800', '2026-09-01', 'u1')
    expect(await leerParametro('gdp_objetivo', '2026-09-01')).toBe('800')
  })
})

describe('configurarParametro — valida el orden de los umbrales', () => {
  beforeEach(async () => {
    await guardarParametro('umbral_excelente', '900', '2026-01-01', 'u1')
    await guardarParametro('umbral_bueno', '750', '2026-01-01', 'u1')
    await guardarParametro('umbral_normal', '600', '2026-01-01', 'u1')
    await guardarParametro('umbral_bajo', '400', '2026-01-01', 'u1')
  })

  it('rechaza subir "bueno" por encima de "excelente"', async () => {
    await expect(configurarParametro('umbral_bueno', '950', '2026-09-01', 'u1')).rejects.toThrow(
      /excelente.*mayor.*bueno/,
    )
    // No debe haber quedado ninguna fila nueva: el rechazo es antes de guardar.
    expect(await leerParametro('umbral_bueno', '2026-09-01')).toBe('750')
  })

  it('rechaza bajar "excelente" por debajo de "bueno"', async () => {
    await expect(configurarParametro('umbral_excelente', '700', '2026-09-01', 'u1')).rejects.toThrow(/mayor/)
  })

  it('detecta el desorden aunque el umbral vecino no esté configurado (transitividad)', async () => {
    // Deja "bueno" sin ningún valor vigente en la fecha de la prueba, para
    // que la comparación directa entre "excelente" y "normal" (no vecinos
    // consecutivos) sea la única forma de atrapar el desorden.
    await prisma.parametro.deleteMany({ where: { clave: 'umbral_bueno' } })
    await expect(configurarParametro('umbral_excelente', '500', '2026-09-01', 'u1')).rejects.toThrow(
      /excelente.*mayor.*normal/,
    )
  })

  it('acepta un cambio que conserva el orden', async () => {
    await configurarParametro('umbral_excelente', '950', '2026-09-01', 'u1')
    expect(await leerParametro('umbral_excelente', '2026-09-01')).toBe('950')
  })

  it('rechaza un umbral igual a su vecino, no solo uno menor', async () => {
    await expect(configurarParametro('umbral_bueno', '900', '2026-09-01', 'u1')).rejects.toThrow(/mayor/)
  })

  it('valida el orden vigente en la fecha de la nueva vigencia, no en hoy', async () => {
    // "Bueno" sube a 950 a partir de 2027-01-01. En esa fecha, "excelente"
    // seguirá en 900 (nadie programó un cambio para entonces), así que debe
    // rechazarse aunque hoy la comparación no aplique todavía.
    await expect(configurarParametro('umbral_bueno', '950', '2027-01-01', 'u1')).rejects.toThrow(/mayor/)
  })
})

describe('configurarParametro — hectáreas útiles', () => {
  // A diferencia de los umbrales, esta clave no participa de ningún orden
  // entre parámetros: lo único propio que valida es que el número sea mayor
  // que cero, igual que exigía `actualizarHectareasUtiles` antes de que este
  // valor viviera en `Finca`.
  it('rechaza cero', async () => {
    await expect(configurarParametro(CLAVE_HECTAREAS_UTILES, '0', '2026-09-01', 'u1')).rejects.toThrow(
      /mayor que cero/,
    )
  })

  it('rechaza negativos', async () => {
    await expect(configurarParametro(CLAVE_HECTAREAS_UTILES, '-5', '2026-09-01', 'u1')).rejects.toThrow(
      /mayor que cero/,
    )
  })

  it('acepta un número positivo y lo guarda como parámetro, con vigencia e histórico', async () => {
    await configurarParametro(CLAVE_HECTAREAS_UTILES, '40', '2026-09-01', 'u1')
    expect(await leerParametro(CLAVE_HECTAREAS_UTILES, '2026-09-01')).toBe('40')

    const historial = await historialParametro(CLAVE_HECTAREAS_UTILES)
    expect(historial).toEqual([{ valor: '40', vigenteDesde: '2026-09-01' }])
  })

  it('un cambio de hoy en adelante no reescribe lo que ya regía en fechas anteriores', async () => {
    // Es exactamente el defecto que este parámetro corrige: corregir las
    // hectáreas hoy no puede alterar la carga animal de un ciclo ya cerrado.
    await guardarParametro(CLAVE_HECTAREAS_UTILES, '35', '2000-01-01', 'u1')
    await configurarParametro(CLAVE_HECTAREAS_UTILES, '40', '2026-09-01', 'u1')

    expect(await leerParametro(CLAVE_HECTAREAS_UTILES, '2026-01-01')).toBe('35')
    expect(await leerParametro(CLAVE_HECTAREAS_UTILES, '2026-09-01')).toBe('40')
  })
})

describe('dejaSinVigenteHoy', () => {
  it('avisa cuando la única vigencia que tendría la clave es futura', async () => {
    expect(await dejaSinVigenteHoy('gdp_objetivo', '2027-01-01', '2026-10-01')).toBe(true)
  })

  it('no avisa cuando ya hay un valor anterior vigente hoy', async () => {
    await guardarParametro('gdp_objetivo', '750', '2026-01-01', 'u1')
    expect(await dejaSinVigenteHoy('gdp_objetivo', '2027-01-01', '2026-10-01')).toBe(false)
  })

  it('no avisa cuando la nueva vigencia es hoy o anterior', async () => {
    expect(await dejaSinVigenteHoy('gdp_objetivo', '2026-10-01', '2026-10-01')).toBe(false)
  })
})

describe('revisarCambioParametro', () => {
  it('lanza si el valor no es válido, sin llegar a calcular el aviso', async () => {
    await expect(revisarCambioParametro('gdp_objetivo', 'x', '2027-01-01', '2026-10-01')).rejects.toThrow(/número/)
  })

  it('devuelve el aviso de "sin vigente hoy" cuando aplica, sin guardar nada', async () => {
    const revision = await revisarCambioParametro('gdp_objetivo', '800', '2027-01-01', '2026-10-01')
    expect(revision.dejaSinVigenteHoy).toBe(true)
    expect(await leerParametro('gdp_objetivo', '2026-10-01')).toBeNull()
    expect(await leerParametro('gdp_objetivo', '2027-01-01')).toBeNull()
  })

  it('no avisa cuando la vigencia es hoy', async () => {
    const revision = await revisarCambioParametro('gdp_objetivo', '800', '2026-10-01', '2026-10-01')
    expect(revision.dejaSinVigenteHoy).toBe(false)
  })
})
