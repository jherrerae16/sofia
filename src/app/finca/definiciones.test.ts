import { describe, expect, it } from 'vitest'
import { CLAVES_UMBRAL } from '@/datos/parametros'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_PARAMETRO,
  DEFINICIONES_UMBRAL,
} from './definiciones'

// Las claves de aquí son texto suelto, sin el tipo literal que las ataría a
// CLAVES_UMBRAL en tiempo de compilación: un typo (p. ej. "umbral_excelnte")
// pasaría el chequeo de tipos sin problema y dejaría ese umbral sin
// pantalla para configurarlo. Esta prueba es la que sí lo atrapa.
describe('definiciones de parámetros', () => {
  it('DEFINICIONES_UMBRAL cubre exactamente las cuatro claves de CLAVES_UMBRAL, en el mismo orden', () => {
    expect(DEFINICIONES_UMBRAL.map((d) => d.clave)).toEqual(CLAVES_UMBRAL)
  })

  it('DEFINICIONES_PARAMETRO cubre los siete parámetros configurables, sin repetir ninguna clave', () => {
    const claves = DEFINICIONES_PARAMETRO.map((d) => d.clave)
    expect(claves).toEqual([...CLAVES_UMBRAL, 'gdp_objetivo', 'peso_objetivo_venta_kg', 'hectareas_utiles'])
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('cada definición trae una explicación no vacía, en lenguaje de ganadero', () => {
    for (const definicion of DEFINICIONES_PARAMETRO) {
      expect(definicion.explicacion.length).toBeGreaterThan(20)
      expect(definicion.titulo.length).toBeGreaterThan(0)
      expect(definicion.unidad.length).toBeGreaterThan(0)
    }
  })

  // El semáforo (los cuatro umbrales) solo se pinta en "Cómo vamos": la
  // portada no pinta colores (solo cuenta cuántos animales quedan por debajo
  // del umbral "Bajo") y la ficha del animal todavía no clasifica nada.
  // Prometerle al ganadero que va a ver el cambio en una pantalla que no lo
  // muestra es justo el defecto que estas pruebas fijan.
  it('el umbral "Excelente" aclara que el semáforo solo se pinta en "Cómo vamos", no en la portada ni en la ficha', () => {
    const explicacion = DEFINICIONES_UMBRAL[0].explicacion
    expect(explicacion).toMatch(/semáforo, en "Cómo vamos"/)
    expect(explicacion).toMatch(/portada no pinta colores/)
    expect(explicacion).toMatch(/ficha de cada animal tampoco clasifica nada/)
  })

  it('la meta de ganancia diaria aclara que la portada no la usa', () => {
    expect(DEFINICION_GDP_OBJETIVO.explicacion).toMatch(/portada no la usa/)
  })

  it('el peso de venta avisa que hoy no mueve ninguna pantalla', () => {
    expect(DEFINICION_PESO_OBJETIVO.explicacion).toMatch(/ninguna pantalla lo consume todavía/)
  })
})
