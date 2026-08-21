export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/((?!entrar|api/auth|_next/static|_next/image|favicon.ico).*)'],
  // La convención "middleware" (deprecada en Next 16 a favor de "proxy") sigue
  // usando el runtime Edge por defecto, donde Prisma no funciona. `auth()`
  // depende de `@/datos/cliente`, así que forzamos Node.js aquí.
  runtime: 'nodejs',
}
