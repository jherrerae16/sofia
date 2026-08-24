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

        <div className="space-y-3">
          <input
            name="correo"
            type="email"
            required
            placeholder="Correo"
            className="w-full rounded border border-borde bg-papel p-3 text-[14px] outline-none"
          />
          <input
            name="clave"
            type="password"
            required
            placeholder="Clave"
            className="w-full rounded border border-borde bg-papel p-3 text-[14px] outline-none"
          />
          <button className="w-full rounded bg-monte p-3 text-[14px] font-semibold text-papel">
            Entrar
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.2em] text-carbon-3">SOFIA</p>
      </form>
    </main>
  )
}
