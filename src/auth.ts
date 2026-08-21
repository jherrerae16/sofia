import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/datos/cliente'

// Hash señuelo, calculado una sola vez al cargar el módulo (nunca por
// intento fallido): si se generara en cada intento, bcrypt volvería a
// introducir la diferencia de tiempo que este hash busca eliminar.
// Cuando el correo no existe, comparamos igual contra este hash fijo para
// que la rama "correo inexistente" tarde lo mismo que "correo existente,
// clave incorrecta" y no se pueda enumerar correos por latencia.
const HASH_SEÑUELO = bcrypt.hashSync('correo-inexistente-no-revela-nada', 12)

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
      credentials: { correo: {}, clave: {} },
      async authorize(datos) {
        const correo = String(datos.correo ?? '').toLowerCase().trim()
        const clave = String(datos.clave ?? '')
        const usuario = await prisma.usuario.findUnique({ where: { correo } })
        // Siempre se ejecuta bcrypt.compare, exista o no el usuario, contra
        // el hash real o el señuelo: así el tiempo de respuesta es el mismo
        // en ambas ramas y no delata si el correo está registrado.
        const claveValida = await bcrypt.compare(clave, usuario?.claveHash ?? HASH_SEÑUELO)
        if (!usuario || !claveValida) return null
        return { id: usuario.id, name: usuario.nombre, email: usuario.correo }
      },
    }),
  ],
})

export async function usuarioActual(): Promise<{ id: string; nombre: string }> {
  const sesion = await auth()
  if (!sesion?.user?.id) throw new Error('Sin sesión')
  return { id: sesion.user.id, nombre: sesion.user.name ?? '' }
}
