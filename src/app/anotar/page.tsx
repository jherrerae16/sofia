import { redirect } from 'next/navigation'

/** Anotar no es una pantalla: es seis. Se entra por la más frecuente. */
export default function Anotar() {
  redirect('/anotar/pesos')
}
