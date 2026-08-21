import { diasEntre } from '@/calc/fechas'
import type { FechaISO } from '@/calc/tipos'
import { prisma } from './cliente'
import { aFechaISO } from './conversion'

/** A partir de este punto los indicadores dejan de describir la finca de hoy. */
const DIAS_PARA_ALARMA = 30

export type Frescura = {
  ultimaFecha: FechaISO | null
  diasSinDatos: number | null
  alarmante: boolean
}

export async function frescura(hoy: FechaISO): Promise<Frescura> {
  const ultimo = await prisma.pesaje.findFirst({
    where: { anuladoEn: null },
    orderBy: { fecha: 'desc' },
    select: { fecha: true },
  })

  if (!ultimo) return { ultimaFecha: null, diasSinDatos: null, alarmante: true }

  const ultimaFecha = aFechaISO(ultimo.fecha)
  const diasSinDatos = diasEntre(ultimaFecha, hoy)
  // Un `diasSinDatos` negativo significa que el último pesaje quedó fechado
  // en el futuro (el error clásico de año digitado de más). Eso no es
  // frescura: es un dato roto, y hay que alarmar igual que si no hubiera
  // datos recientes, no apagar la alarma durante meses.
  const alarmante = diasSinDatos > DIAS_PARA_ALARMA || diasSinDatos < 0
  return { ultimaFecha, diasSinDatos, alarmante }
}
