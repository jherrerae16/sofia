import { Marco } from '@/ui/Marco'

// Todo lo que se ve aquí cambia con el día y con lo que se digitó hace un
// minuto. Sin esto Next prerenderiza la ruta en el build y los datos se
// congelan para siempre.
export const dynamic = 'force-dynamic'

export default function Ganado() {
  return (
    <Marco>
      <h1 className="pt-13 text-[clamp(27px,3.8vw,40px)] font-semibold leading-[1.18] tracking-[-0.022em] text-monte">
        El ganado
      </h1>
      <footer className="mt-18 border-t border-borde pt-[18px] text-[12px] text-carbon-3">
        SOFÍA — por Sofanor Echeverría.
      </footer>
    </Marco>
  )
}
