import { Marco } from '@/ui/Marco'
import { ModosAnotar } from './ModosAnotar'

/**
 * La cinta de modos es lo único que comparten los seis. El titular lo pone
 * cada modo, porque cada uno dice algo distinto: "Pasa la libreta" no sirve
 * para anotar una vacuna.
 */
export default function AnotarLayout({ children }: { children: React.ReactNode }) {
  return (
    <Marco>
      <ModosAnotar />
      {children}
    </Marco>
  )
}
