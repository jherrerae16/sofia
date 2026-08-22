import { describe, expect, it } from 'vitest'
import { CLAVES_UMBRAL } from '@/datos/parametros'
import { DEFINICIONES_PARAMETRO, DEFINICIONES_UMBRAL } from './definiciones'

// Las claves de aquí son texto suelto, sin el tipo literal que las ataría a
// CLAVES_UMBRAL en tiempo de compilación: un typo (p. ej. "umbral_excelnte")
// pasaría el chequeo de tipos sin problema y dejaría ese umbral sin
// pantalla para configurarlo. Esta prueba es la que sí lo atrapa.
describe('definiciones de parámetros', () => {
  it('DEFINICIONES_UMBRAL cubre exactamente las cuatro claves de CLAVES_UMBRAL, en el mismo orden', () => {
    expect(DEFINICIONES_UMBRAL.map((d) => d.clave)).toEqual(CLAVES_UMBRAL)
  })

  it('DEFINICIONES_PARAMETRO cubre los seis parámetros configurables, sin repetir ninguna clave', () => {
    const claves = DEFINICIONES_PARAMETRO.map((d) => d.clave)
    expect(claves).toEqual([...CLAVES_UMBRAL, 'gdp_objetivo', 'peso_objetivo_venta_kg'])
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('cada definición trae una explicación no vacía, en lenguaje de ganadero', () => {
    for (const definicion of DEFINICIONES_PARAMETRO) {
      expect(definicion.explicacion.length).toBeGreaterThan(20)
      expect(definicion.titulo.length).toBeGreaterThan(0)
      expect(definicion.unidad.length).toBeGreaterThan(0)
    }
  })
})
