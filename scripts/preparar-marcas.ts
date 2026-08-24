/**
 * Convierte las dos imágenes de marca en PNG con fondo transparente.
 *
 * Las dos llegaron como capturas: la vaca sobre un fondo crema y el logo de la
 * finca dentro de un pantallazo de celular. Pegarlas tal cual dejaría un
 * cuadrado de color distinto sobre el blanco de la plataforma, así que aquí se
 * recortan y se les saca el fondo.
 *
 * El método es el de dibujo de línea: la transparencia sale de la luminosidad
 * (lo claro se vuelve invisible, lo oscuro se queda) y el color se reemplaza
 * por una sola tinta. Sirve para línea negra sobre blanco y para línea café
 * sobre crema, que es justo lo que hay.
 *
 *   npx tsx scripts/preparar-marcas.ts
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type Sharp } from 'sharp'

const SALIDA = path.join(process.cwd(), 'public', 'marca')

/** Por debajo de esta luminosidad el trazo es totalmente opaco. */
const TINTA = 70
/** Por encima de esta luminosidad el pixel es fondo y desaparece. */
const FONDO = 232

async function aLineaTransparente(
  entrada: Sharp,
  ink: { r: number; g: number; b: number },
): Promise<Buffer> {
  const { data, info } = await entrada
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const canales = info.channels
  const salida = Buffer.alloc(info.width * info.height * 4)

  for (let i = 0, j = 0; i < data.length; i += canales, j += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const alfa =
      lum <= TINTA ? 255 : lum >= FONDO ? 0 : Math.round(((FONDO - lum) / (FONDO - TINTA)) * 255)
    salida[j] = ink.r
    salida[j + 1] = ink.g
    salida[j + 2] = ink.b
    salida[j + 3] = alfa
  }

  return sharp(salida, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer()
}

async function main() {
  const [vacaOrigen, logoOrigen] = process.argv.slice(2)
  if (!vacaOrigen || !logoOrigen) {
    console.error('Uso: npx tsx scripts/preparar-marcas.ts <vaca.jpeg> <captura-del-logo.png>')
    process.exit(1)
  }

  await mkdir(SALIDA, { recursive: true })

  // La vaca viene en línea café sobre crema; se conserva el café como tinta
  // porque es el único punto cálido que va a quedar en la interfaz.
  const vaca = await aLineaTransparente(sharp(vacaOrigen), { r: 47, g: 38, b: 30 })
  await sharp(vaca).resize({ height: 128, withoutEnlargement: true }).toFile(
    path.join(SALIDA, 'vaca.png'),
  )

  // El logo de la finca sale en dos tamaños del mismo original: el conjunto
  // completo (ojo y letras) para la pantalla de entrar, y solo el ojo para
  // cuando tiene que caber pequeño y las letras no se leerían.
  const logo = await aLineaTransparente(sharp(logoOrigen), { r: 17, g: 17, b: 17 })
  await sharp(logo).resize({ height: 420, withoutEnlargement: true }).toFile(
    path.join(SALIDA, 'santa-veronica.png'),
  )

  const meta = await sharp(logo).metadata()
  const ojo = await sharp(logo)
    // El ojo ocupa el 63% de arriba del conjunto: con menos se le cortan los
    // rayos de abajo, que son parte del dibujo y no un adorno.
    .extract({ left: 0, top: 0, width: meta.width!, height: Math.round(meta.height! * 0.63) })
    .trim({ threshold: 1 })
    .png()
    .toBuffer()
  await sharp(ojo).resize({ height: 96, withoutEnlargement: true }).toFile(
    path.join(SALIDA, 'santa-veronica-ojo.png'),
  )

  for (const nombre of ['vaca.png', 'santa-veronica.png', 'santa-veronica-ojo.png']) {
    const meta = await sharp(path.join(SALIDA, nombre)).metadata()
    console.log(`public/marca/${nombre} — ${meta.width}×${meta.height}`)
  }
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exitCode = 1
})
