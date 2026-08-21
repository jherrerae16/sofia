import { describe, expect, it } from 'vitest'
import { proyectarLlegada, proyectarPeso } from './proyeccion'

describe('proyectarPeso', () => {
  it('proyecta el peso a partir de la ganancia observada', () => {
    expect(proyectarPeso(200, 800, 90)).toBe(272)
  })

  it('devuelve null sin ganancia observada', () => {
    expect(proyectarPeso(200, null, 90)).toBeNull()
  })

  it('proyecta a la baja si el animal viene perdiendo peso', () => {
    expect(proyectarPeso(200, -100, 30)).toBe(197)
  })

  it('redondea a un decimal', () => {
    expect(proyectarPeso(200, 833, 30)).toBe(225)
  })
})

describe('proyectarLlegada', () => {
  it('calcula días y fecha estimada para alcanzar el peso objetivo', () => {
    const llegada = proyectarLlegada(200, 320, 800, '2026-10-01')
    expect(llegada).not.toBeNull()
    expect(llegada!.dias).toBe(150)
    expect(llegada!.fecha).toBe('2027-02-28')
  })

  it('devuelve cero días si el animal ya alcanzó el objetivo', () => {
    const llegada = proyectarLlegada(330, 320, 800, '2026-10-01')
    expect(llegada!.dias).toBe(0)
    expect(llegada!.fecha).toBe('2026-10-01')
  })

  it('devuelve null si el animal no está ganando peso', () => {
    expect(proyectarLlegada(200, 320, 0, '2026-10-01')).toBeNull()
    expect(proyectarLlegada(200, 320, -100, '2026-10-01')).toBeNull()
  })

  it('devuelve null sin ganancia observada', () => {
    expect(proyectarLlegada(200, 320, null, '2026-10-01')).toBeNull()
  })
})
