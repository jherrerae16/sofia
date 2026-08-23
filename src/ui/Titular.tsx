import Link from 'next/link'

export type Aviso = {
  texto: string
  enlace?: { href: string; texto: string }
  /** Enciende el punto en barro: algo que hay que atender, no solo saber. */
  grave?: boolean
}

/**
 * El titular en prosa de una pantalla, con sus avisos debajo.
 *
 * Los avisos son líneas, no tarjetas: tres tarjetas de colores compiten entre
 * sí y con el titular, y el ojo termina sin saber qué leer primero.
 */
export function Titular({
  children,
  avisos = [],
}: {
  children: React.ReactNode
  avisos?: Aviso[]
}) {
  return (
    <div className="max-w-[820px] pt-13">
      {children}
      {avisos.length > 0 && (
        <div data-testid="avisos" className="mt-[22px] flex flex-col gap-[9px]">
          {avisos.map((aviso) => (
            <div
              key={aviso.texto}
              className="flex flex-wrap items-center gap-[10px] text-[14px] text-carbon-2"
            >
              <span
                aria-hidden
                className={`h-[6px] w-[6px] flex-none rounded-full ${
                  aviso.grave ? 'bg-barro' : 'bg-carbon-3'
                }`}
              />
              <span>{aviso.texto}</span>
              {aviso.enlace && (
                <Link
                  href={aviso.enlace.href}
                  className="text-carbon underline underline-offset-[3px]"
                >
                  {aviso.enlace.texto}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
