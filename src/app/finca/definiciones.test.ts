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

  // Prometerle al ganadero que un número cambia algo en una pantalla que no
  // lo muestra es el defecto que estas tres pruebas fijan. Se rompen a
  // propósito cuando una pantalla cambia de nombre o deja de consumir un
  // parámetro: ese es su trabajo -- avisar que el texto quedó mintiendo.
  it('de los cuatro umbrales, la explicación dice cuál es el único que hoy cambia algo', () => {
    expect(DEFINICIONES_UMBRAL[0].explicacion).toMatch(/el único que hoy cambia lo que ves es "Bajo"/)
    expect(DEFINICIONES_UMBRAL[0].explicacion).toMatch(/quedado en Ganado/)
  })

  it('la meta de ganancia diaria dice que es la línea punteada de las dos curvas', () => {
    expect(DEFINICION_GDP_OBJETIVO.explicacion).toMatch(/línea punteada/)
    expect(DEFINICION_GDP_OBJETIVO.explicacion).toMatch(/Ganado/)
  })

  // El dueño leyó "Peso de venta" como el peso total esperado del lote, no el
  // de un animal. El título y la explicación tienen que dejarlo sin lugar a
  // duda: es por cabeza.
  it('el peso de venta deja claro que es por animal, no del lote entero', () => {
    expect(DEFINICION_PESO_OBJETIVO.titulo).toMatch(/UN novillo/)
    expect(DEFINICION_PESO_OBJETIVO.explicacion).toMatch(/no el del lote entero/)
  })
})
