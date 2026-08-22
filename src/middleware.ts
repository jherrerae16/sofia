export { auth as middleware } from '@/auth'

export const config = {
  // Los límites de segmento van anclados con (?:$|/) o $ en cada exclusión:
  // sin anclar, "entrar" como prefijo dejaba pasar sin sesión rutas como
  // "/entrarXYZ" o "/api/authorization", que no son las rutas públicas
  // reales pero coincidían por empezar con la misma cadena.
  //
  // "_next/image" llevaba el mismo problema al revés: anclado solo con "/"
  // al final, dejaba "/_next/image" (sin barra, que es como Next sirve el
  // propio servicio de optimización de imágenes) fuera de la exclusión y
  // protegido por la autenticación. Falla cerrado, así que hoy no es una
  // fuga -- pero el día que una pantalla pública use una imagen optimizada
  // quedaría bloqueada, y de paso haría correr la autenticación con base de
  // datos en cada imagen. Se ancla igual que "entrar", con (?:$|/), y se
  // suma "?" para no dejar fuera "/_next/image?url=...", que es la forma en
  // que Next arma esa dirección en la práctica.
  matcher: [
    '/((?!entrar(?:$|/)|api/auth/|_next/static/|_next/image(?:$|/|\\?)|favicon\\.ico$).*)',
  ],
  // La convención "middleware" (deprecada en Next 16 a favor de "proxy") sigue
  // usando el runtime Edge por defecto, donde Prisma no funciona. `auth()`
  // depende de `@/datos/cliente`, así que forzamos Node.js aquí.
  runtime: 'nodejs',
}
