import { permanentRedirect } from 'next/navigation'

// El dueño tiene enlaces guardados en el navegador desde antes del rediseño.
// Una redirección permanente cuesta un archivo de tres líneas; un 404 le
// cuesta a él encontrar de nuevo dónde quedó la pantalla.
export default function Lotes() {
  permanentRedirect('/anotar/entrada')
}
