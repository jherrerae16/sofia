import { describe, expect, it } from 'vitest'
import {
  DEFINICION_GDP_OBJETIVO,
  DEFINICION_PESO_OBJETIVO,
  DEFINICIONES_PARAMETRO,
} from './definiciones'

describe('definiciones de parámetros', () => {
  it('quedan tres criterios configurables, sin repetir ninguna clave', () => {
    // Eran siete: los cuatro umbrales del semáforo se fueron cuando el dueño
    // decidió que la meta de ganancia diaria es el único criterio -- por
    // encima el animal va bien, por debajo es alerta.
    const claves = DEFINICIONES_PARAMETRO.map((d) => d.clave)
    expect(claves).toEqual(['gdp_objetivo', 'peso_objetivo_venta_kg', 'hectareas_utiles'])
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('cada definición trae una explicación no vacía, en lenguaje de ganadero', () => {
    for (const definicion of DEFINICIONES_PARAMETRO) {
      expect(definicion.explicacion.length).toBeGreaterThan(20)
      expect(definicion.titulo.length).toBeGreaterThan(0)
      expect(definicion.unidad.length).toBeGreaterThan(0)
    }
  })

  // Prometerle al ganadero que un número cambia algo en una pantalla que no lo
  // muestra es el defecto que estas dos pruebas fijan. Se rompen a propósito
  // cuando una pantalla cambia de nombre o deja de consumir un criterio: ese
  // es su trabajo -- avisar que el texto quedó mintiendo.
  it('la meta de ganancia dice que es el único criterio y qué marca', () => {
    expect(DEFINICION_GDP_OBJETIVO.explicacion).toMatch(/único criterio/)
    expect(DEFINICION_GDP_OBJETIVO.explicacion).toMatch(/quedado en Ganado/)
  })

  // El dueño leyó "Peso de venta" como el peso total esperado del lote, no el
  // de un animal. El título y la explicación tienen que dejarlo sin lugar a
  // duda: es por cabeza.
  it('el peso de venta deja claro que es por animal, no del lote entero', () => {
    expect(DEFINICION_PESO_OBJETIVO.titulo).toMatch(/UN novillo/)
    expect(DEFINICION_PESO_OBJETIVO.explicacion).toMatch(/no el del lote entero/)
  })
})
