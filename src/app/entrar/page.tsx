import { signIn } from '@/auth'

export default function Entrar() {
  async function entrar(datos: FormData) {
    'use server'
    await signIn('credentials', {
      correo: datos.get('correo'),
      clave: datos.get('clave'),
      redirectTo: '/',
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-crema p-6">
      <form action={entrar} className="w-full max-w-sm space-y-4">
        <h1 className="text-[28px] font-extrabold tracking-[0.2em] text-monte">SOFÍA</h1>
        <p className="text-sm text-carbon-2">Finca Santa Verónica</p>
        <input
          name="correo"
          type="email"
          required
          placeholder="Correo"
          className="w-full rounded border border-borde bg-white p-3"
        />
        <input
          name="clave"
          type="password"
          required
          placeholder="Clave"
          className="w-full rounded border border-borde bg-white p-3"
        />
        <button className="w-full rounded bg-monte p-3 text-[14px] font-semibold text-crema">Entrar</button>
      </form>
    </main>
  )
}
