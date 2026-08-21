import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './cliente'
import { guardarParametro, leerGdpObjetivo, leerParametro, leerUmbrales } from './parametros'

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
