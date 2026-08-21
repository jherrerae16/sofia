import type { Clasificacion } from '@/calc/clasificacion'

const ESTILOS: Record<Clasificacion, { texto: string; clase: string }> = {
  excelente: { texto: 'Excelente', clase: 'bg-pasto text-white' },
  bueno: { texto: 'Bueno', clase: 'bg-pasto-medio text-white' },
  normal: { texto: 'Normal', clase: 'bg-pasto-claro text-carbon' },
  bajo: { texto: 'Bajo', clase: 'bg-ambar text-white' },
  critico: { texto: 'Crítico', clase: 'bg-rojo-tierra text-white' },
  sin_dato: { texto: 'Sin dato', clase: 'bg-carbon/10 text-carbon/60' },
}

export function Semaforo({ clasificacion }: { clasificacion: Clasificacion }) {
  const { texto, clase } = ESTILOS[clasificacion]
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>
  )
}
