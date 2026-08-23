import Link from 'next/link'

type Props = {
  children: React.ReactNode
  /** Con `href` es un enlace; sin él, un botón de formulario. */
  href?: string
  fantasma?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  name?: string
  value?: string
}

export function Boton({ children, href, fantasma, type = 'button', disabled, name, value }: Props) {
  const clases = `inline-block rounded px-5 py-3 text-[14px] font-semibold no-underline ${
    fantasma ? 'border border-borde-2 bg-white text-carbon' : 'border-0 bg-monte text-crema'
  } ${disabled ? 'opacity-50' : ''}`

  if (href) {
    return (
      <Link href={href} className={clases}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled} name={name} value={value} className={clases}>
      {children}
    </button>
  )
}
