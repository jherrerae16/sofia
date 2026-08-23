import { EstadoAnimal, MetodoPesaje, TipoEventoSanitario, TipoLote, TipoNovedad } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  ETIQUETA_ESTADO_ANIMAL,
  ETIQUETA_METODO_PESAJE,
  ETIQUETA_TIPO_EVENTO,
  ETIQUETA_TIPO_LOTE,
  ETIQUETA_TIPO_NOVEDAD,
} from './etiquetas'

// Cada mapa tiene que cubrir exactamente los valores que Prisma genera para
// su enum: ni de menos (una pantalla se quedaría mostrando el valor crudo
// para el valor que falte) ni de más (una clave muerta que nadie usa).
describe('etiquetas de enums', () => {
  it('ETIQUETA_ESTADO_ANIMAL cubre los cuatro estados de EstadoAnimal', () => {
    expect(Object.keys(ETIQUETA_ESTADO_ANIMAL).sort()).toEqual(Object.values(EstadoAnimal).sort())
  })

  it('ETIQUETA_TIPO_LOTE cubre los tres tipos de TipoLote', () => {
    expect(Object.keys(ETIQUETA_TIPO_LOTE).sort()).toEqual(Object.values(TipoLote).sort())
  })

  it('ETIQUETA_METODO_PESAJE cubre los tres métodos de MetodoPesaje', () => {
    expect(Object.keys(ETIQUETA_METODO_PESAJE).sort()).toEqual(Object.values(MetodoPesaje).sort())
  })

  it('ETIQUETA_TIPO_EVENTO cubre los cuatro tipos de TipoEventoSanitario', () => {
    expect(Object.keys(ETIQUETA_TIPO_EVENTO).sort()).toEqual(Object.values(TipoEventoSanitario).sort())
  })

  it('ETIQUETA_TIPO_NOVEDAD cubre los dos tipos de TipoNovedad', () => {
    expect(Object.keys(ETIQUETA_TIPO_NOVEDAD).sort()).toEqual(Object.values(TipoNovedad).sort())
  })

  it('ninguna etiqueta es el valor crudo sin traducir', () => {
    for (const [valor, etiqueta] of Object.entries(ETIQUETA_TIPO_EVENTO)) {
      expect(etiqueta).not.toBe(valor)
    }
  })
})
