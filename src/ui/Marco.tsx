/** El ancho máximo y el respiro que comparten todas las pantallas. */
export function Marco({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1120px] px-7 pb-24">{children}</div>
}
