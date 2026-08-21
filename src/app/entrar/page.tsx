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
    <main className="flex min-h-screen items-center justify-center bg-[#F7F4EC] p-6">
      <form action={entrar} className="w-full max-w-sm space-y-4">
        <h1 className="font-serif text-3xl text-[#1B5E3F]">SOFÍA</h1>
        <p className="text-sm text-[#23201B]/70">Finca Santa Verónica</p>
        <input
          name="correo"
          type="email"
          required
          placeholder="Correo"
          className="w-full rounded border border-[#8B5E3C]/30 bg-white p-3"
        />
        <input
          name="clave"
          type="password"
          required
          placeholder="Clave"
          className="w-full rounded border border-[#8B5E3C]/30 bg-white p-3"
        />
        <button className="w-full rounded bg-[#1B5E3F] p-3 font-medium text-white">Entrar</button>
      </form>
    </main>
  )
}
