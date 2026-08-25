import { Marco } from '@/ui/Marco'

/**
 * Los seis modos de Anotar tenían aquí su propia cinta de pestañas. Se fue
 * cuando el menú lateral pasó a listar cada uno como un renglón propio: eran
 * los mismos seis destinos dibujados dos veces en la misma pantalla, y el de
 * arriba ni siquiera era el que se usaba.
 */
export default function AnotarLayout({ children }: { children: React.ReactNode }) {
  return <Marco>{children}</Marco>
}
