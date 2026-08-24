import { describe, expect, it } from 'vitest'
import { clasificar } from './clasificacion'

const META = 750

describe('clasificar', () => {
  it('un animal que va por encima de la meta va bien', () => {
    expect(clasificar(800, META)).toBe('bien')
  })

  it('justo en la meta va bien: la meta se cumple alcanzándola, no superándola', () => {
    expect(clasificar(750, META)).toBe('bien')
  })

  it('un gramo por debajo de la meta ya es alerta', () => {
    expect(clasificar(749, META)).toBe('quedado')
  })

  it('un animal que pierde peso está quedado', () => {
    expect(clasificar(-200, META)).toBe('quedado')
  })

  it('sin ganancia calculable no se dice nada', () => {
    expect(clasificar(null, META)).toBe('sin_dato')
  })

  it('sin meta fijada tampoco se dice nada', () => {
    // Decir que un animal "va quedado" sin una meta contra la cual medirlo
    // sería una opinión de la plataforma, no del dueño.
    expect(clasificar(300, null)).toBe('sin_dato')
  })

  it('respeta la meta que fijó el dueño, no una del código', () => {
    expect(clasificar(900, 1000)).toBe('quedado')
    expect(clasificar(900, 850)).toBe('bien')
  })
})
