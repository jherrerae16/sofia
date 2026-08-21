export type EstadoAnimal = 'activo' | 'vendido' | 'muerto' | 'robado'

export type AnimalProduccion = {
  estado: EstadoAnimal
  pesoEntradaKg: number
  /** Último peso medido, o null si nunca se ha pesado. */
  pesoUltimoKg: number | null
}

/**
 * Kilos adicionales producidos por el grupo.
 *
 * Los animales muertos y robados aportan cero: sus kilos no llegaron a venderse,
 * aunque su costo permanezca en el ciclo. Contarlos inflaría la producción y
 * abarataría artificialmente el costo por kilogramo.
 */
export function kgProducidos(animales: AnimalProduccion[]): number {
  return animales.reduce((total, animal) => {
    if (animal.estado === 'muerto' || animal.estado === 'robado') return total
    if (animal.pesoUltimoKg === null) return total
    return total + (animal.pesoUltimoKg - animal.pesoEntradaKg)
  }, 0)
}
