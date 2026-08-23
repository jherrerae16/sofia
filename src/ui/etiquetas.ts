import type { EstadoAnimal, MetodoPesaje, TipoEventoSanitario, TipoLote, TipoNovedad } from '@prisma/client'

/**
 * Un solo lugar para traducir cada valor de enum de la base a lo que lee el
 * ganadero. Antes cada pantalla que mostraba uno de estos valores lo hacía
 * tal cual salía de la base (`desparasitacion`, sin tilde, en la ficha del
 * animal) o inventaba su propia traducción local y parcial (`SalidaForm` y
 * `PesajesRecientes` ya tenían la suya, cada una cubriendo solo lo que esa
 * pantalla necesitaba). Centralizarlas aquí evita que una pantalla nueva
 * repita el mismo error, y que dos pantallas viejas se desincronicen sobre
 * cómo se escribe el mismo valor.
 */

export const ETIQUETA_ESTADO_ANIMAL: Record<EstadoAnimal, string> = {
  activo: 'Activo',
  vendido: 'Vendido',
  muerto: 'Muerto',
  robado: 'Robado',
}

export const ETIQUETA_TIPO_LOTE: Record<TipoLote, string> = {
  ceba: 'Ceba',
  leche: 'Leche',
  otros: 'Otros',
}

export const ETIQUETA_METODO_PESAJE: Record<MetodoPesaje, string> = {
  cinta: 'cinta bovinométrica',
  bascula: 'báscula',
  estimacion: 'estimación',
}

export const ETIQUETA_TIPO_EVENTO: Record<TipoEventoSanitario, string> = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  vitamina: 'Vitamina',
  tratamiento: 'Tratamiento',
}

export const ETIQUETA_TIPO_NOVEDAD: Record<TipoNovedad, string> = {
  hecho: 'Hecho puntual',
  suministro: 'Suministro en curso',
}
