import { describe, expect, it } from 'vitest'
import { clasificar, type Umbrales } from './clasificacion'
import { gdpAcumulada } from './gdp'
import { promediarGdp } from './lote'
import { calcularCarga } from './potrero'
import { kgProducidos, type AnimalProduccion } from './produccion'
import { proyectarLlegada } from './proyeccion'

const UMBRALES: Umbrales = { excelente: 900, bueno: 750, normal: 600, bajo: 400 }

describe('Santa Verónica — números conocidos', () => {
  it('reproduce el 50,6 % de ganancia proyectado de septiembre a febrero', () => {
    const entrada = { fecha: '2026-09-01', pesoKg: 150 }
    const salida = { fecha: '2027-02-01', pesoKg: 226 }
    const ganancia = (salida.pesoKg - entrada.pesoKg) / entrada.pesoKg
    expect(ganancia).toBeCloseTo(0.506, 2)
    expect(gdpAcumulada(entrada, salida)).toBe(497)
  })

  it('clasifica como crítico el desempeño real del lote 2025', () => {
    const entrada = { fecha: '2025-01-01', pesoKg: 142 }
    const salida = { fecha: '2026-01-01', pesoKg: 254 }
    const gdp = gdpAcumulada(entrada, salida)
    expect(gdp).toBe(307)
    expect(clasificar(gdp, UMBRALES)).toBe('critico')
  })

  it('calcula la carga del lote de 56 novillos sobre las 35 hectáreas útiles', () => {
    const carga = calcularCarga(56 * 200, 56, 35)
    expect(carga!.kgPorHa).toBe(320)
    expect(carga!.cabezasPorHa).toBeCloseTo(1.6, 1)
  })

  it('cuenta la producción de un ciclo con una muerte', () => {
    const animales: AnimalProduccion[] = Array.from({ length: 56 }, (_, i) => ({
      estado: i === 0 ? ('muerto' as const) : ('activo' as const),
      pesoEntradaKg: 150,
      pesoUltimoKg: 226,
    }))
    expect(kgProducidos(animales)).toBe(55 * 76)
  })

  it('estima la fecha de venta con la ganancia objetivo de 750 g por día', () => {
    const llegada = proyectarLlegada(150, 320, 750, '2026-09-01')
    expect(llegada!.dias).toBe(227)
    expect(llegada!.fecha).toBe('2027-04-16')
  })

  it('reporta la cobertura cuando solo se pesan los animales testigo', () => {
    const valores = Array.from({ length: 56 }, (_, i) => (i < 14 ? 800 : null))
    const resumen = promediarGdp(valores, 56)
    expect(resumen.promedio).toBe(800)
    expect(resumen.n).toBe(14)
    expect(resumen.cobertura).toBeCloseTo(0.25, 2)
  })
})
