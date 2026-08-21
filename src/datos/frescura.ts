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
  return { ultimaFecha, diasSinDatos, alarmante: diasSinDatos > DIAS_PARA_ALARMA }
}
