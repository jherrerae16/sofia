'use server'

import { revalidatePath } from 'next/cache'
import { crearPotrero } from '@/datos/potreros'

export async function crearPotreroAccion(datos: FormData) {
  await crearPotrero({
    nombre: String(datos.get('nombre')),
    hectareas: Number(String(datos.get('hectareas')).replace(',', '.')),
    capacidadKg: Number(datos.get('capacidadKg')),
    tipoPasto: (String(datos.get('tipoPasto')) || null) as string | null,
    tieneAgua: datos.get('tieneAgua') === 'on',
  })
  revalidatePath('/finca')
}
