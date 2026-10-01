import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/datos/cliente'
import { verificarClave } from '@/usuarios'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/entrar' },
  callbacks: {
    // Sin estos dos, session.user.id llega undefined y todo registro quedaría sin autor.
    jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
    // Sin este callback, `auth` usado como middleware no bloquea nada: por
    // defecto `authorized` vale `true` y toda ruta queda abierta aunque no
    // haya sesión. Con esto, cualquier ruta sin sesión redirige a /entrar.
    authorized({ auth: sesion }) {
      return !!sesion?.user
    },
  },
  providers: [
    Credentials({
      credentials: { usuario: {}, clave: {} },
      async authorize(datos) {
        const cuenta = verificarClave(String(datos.usuario ?? ''), String(datos.clave ?? ''))
        if (!cuenta) return null
        // La fila se crea la primera vez que la cuenta entra: así una base
        // recién migrada (la de Vercel) no necesita ningún paso a mano.
        const usuario = await prisma.usuario.upsert({
          where: { usuario: cuenta.usuario },
          update: {},
          create: { usuario: cuenta.usuario, nombre: cuenta.nombre },
        })
        return { id: usuario.id, name: usuario.nombre }
      },
    }),
  ],
})

export async function usuarioActual(): Promise<{ id: string; nombre: string }> {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error('Sin sesión')
  return { id: sesion.user.id, nombre: sesion.user.name ?? '' }
}
