/**
 * El área de contenido, a la derecha del menú lateral. Antes centraba una
 * columna de 1120px porque la navegación iba arriba; ahora el menú ya ocupa la
 * izquierda y centrar otra vez dejaría el contenido corrido hacia la derecha.
 */
export function Marco({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1280px] px-7 pb-20 pt-6">{children}</div>
}
