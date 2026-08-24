import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'

const CAMPO = 'w-full rounded border border-borde bg-papel p-3 text-[14px]'

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function entrar(datos: FormData) {
    'use server'
    try {
      await signIn('credentials', {
        correo: datos.get('correo'),
        clave: datos.get('clave'),
        redirectTo: '/',
      })
    } catch (fallo) {
      // Una clave equivocada no puede dejar la pantalla muda ni tumbarla con
      // el error crudo de Auth.js. `signIn` señala el éxito lanzando una
      // redirección, así que solo se atrapa el fallo de credenciales y se
      // devuelve a la misma pantalla con el aviso.
      if (fallo instanceof AuthError) redirect('/entrar?error=credenciales')
      throw fallo
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-papel p-6">
      <form action={entrar} className="w-full max-w-[300px]">
        {/* La marca de la finca manda aquí y en ningún otro lado: esta es la
            puerta. Adentro manda SOFIA, que es la herramienta. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marca/santa-veronica.png"
          alt="Ganadería Santa Verónica"
          width={545}
          height={420}
          className="mx-auto mb-8 h-[112px] w-auto"
        />

        {error && (
          <p
            role="alert"
            data-testid="error"
            className="mb-4 rounded border border-alerta/40 bg-alerta-suave px-3 py-2 text-[13px] text-alerta"
          >
            El correo o la clave no coinciden. Revísalos e intenta de nuevo.
          </p>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="rotulo mb-[6px] block">Correo</span>
            <input
              name="correo"
              type="email"
              required
              autoComplete="username"
              spellCheck={false}
              placeholder="joseph@ejemplo.com"
              className={CAMPO}
            />
          </label>
          <label className="block">
            <span className="rotulo mb-[6px] block">Clave</span>
            <input
              name="clave"
              type="password"
              required
              autoComplete="current-password"
              spellCheck={false}
              className={CAMPO}
            />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-monte p-3 text-[14px] font-semibold text-papel"
          >
            Entrar
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.2em] text-carbon-3">SOFIA</p>
      </form>
    </main>
  )
}
