import { strFromU8, unzipSync } from 'fflate'

/**
 * Un lector de `.xlsx` mínimo, hecho a mano, solo para que
 * `e2e/exportar.spec.ts` pueda verificar el archivo que el dueño en verdad
 * descarga -- no para reemplazar una librería de lectura completa.
 *
 * Se construye a mano, en vez de sumar una librería de lectura (`xlsx`,
 * `exceljs`, etc.), a propósito: es la misma razón por la que
 * `src/app/exportar/construirLibro.ts` evitó `xlsx`/SheetJS para escribir --
 * no tiene sentido cuidar esa dependencia en el código de producción y
 * relajar el mismo cuidado en la prueba que existe para vigilarlo. Un
 * `.xlsx` es un zip con XML adentro; `fflate` (ya una dependencia real del
 * proyecto, sin vulnerabilidades conocidas) alcanza para abrirlo, y el XML
 * que escribe `write-excel-file` es lo bastante simple como para leerlo con
 * un puñado de expresiones regulares dirigidas, sin un parser de XML
 * completo.
 */

export type CeldaLeida = {
  valor: string | number | boolean | null
  esNumero: boolean
  esTexto: boolean
  esBooleano: boolean
}

export type HojaLeida = {
  nombre: string
  encabezados: string[]
  filas: CeldaLeida[][]
}

function desescaparXml(texto: string): string {
  return texto
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function atributo(etiquetaAbierta: string, nombre: string): string | null {
  const m = etiquetaAbierta.match(new RegExp(`${nombre}="([^"]*)"`))
  return m ? desescaparXml(m[1]) : null
}

/** "B" -> 1, "AA" -> 26 (0-based, como un índice de arreglo). */
function columnaAIndice(referencia: string): number {
  const letras = referencia.match(/^[A-Z]+/)?.[0] ?? ''
  let indice = 0
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64)
  return indice - 1
}

function leerCadenasCompartidas(archivos: Record<string, Uint8Array>): string[] {
  const contenido = archivos['xl/sharedStrings.xml']
  if (!contenido) return []
  const xml = strFromU8(contenido)
  const cadenas: string[] = []
  for (const bloqueSi of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // Una entrada puede ser texto plano (`<t>...</t>`) o texto enriquecido
    // partido en varias corridas (`<r><t>...</t></r><r><t>...</t></r>`):
    // concatenar todos los `<t>` cubre los dos casos.
    const texto = [...bloqueSi[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => desescaparXml(m[1])).join('')
    cadenas.push(texto)
  }
  return cadenas
}

function leerRelaciones(archivos: Record<string, Uint8Array>, ruta: string): Map<string, string> {
  const contenido = archivos[ruta]
  const relaciones = new Map<string, string>()
  if (!contenido) return relaciones
  const xml = strFromU8(contenido)
  for (const m of xml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = atributo(m[0], 'Id')
    const target = atributo(m[0], 'Target')
    if (id && target) relaciones.set(id, target)
  }
  return relaciones
}

function celdaDesdeXml(xmlCelda: string, cadenas: string[]): { columna: number; celda: CeldaLeida } {
  const etiquetaAbierta = xmlCelda.match(/^<c\b[^>]*>/)?.[0] ?? xmlCelda
  const referencia = atributo(etiquetaAbierta, 'r') ?? 'A1'
  const tipo = atributo(etiquetaAbierta, 't')
  const columna = columnaAIndice(referencia)

  if (etiquetaAbierta.endsWith('/>')) {
    return { columna, celda: { valor: null, esNumero: false, esTexto: false, esBooleano: false } }
  }

  if (tipo === 'inlineStr') {
    const texto = xmlCelda.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/)?.[1] ?? ''
    return { columna, celda: { valor: desescaparXml(texto), esNumero: false, esTexto: true, esBooleano: false } }
  }

  const valorCrudo = xmlCelda.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? null
  if (valorCrudo === null) {
    return { columna, celda: { valor: null, esNumero: false, esTexto: false, esBooleano: false } }
  }

  if (tipo === 's') {
    const indice = Number(valorCrudo)
    return { columna, celda: { valor: cadenas[indice] ?? '', esNumero: false, esTexto: true, esBooleano: false } }
  }
  if (tipo === 'str') {
    return { columna, celda: { valor: desescaparXml(valorCrudo), esNumero: false, esTexto: true, esBooleano: false } }
  }
  if (tipo === 'b') {
    return { columna, celda: { valor: valorCrudo === '1', esNumero: false, esTexto: false, esBooleano: true } }
  }
  // Sin atributo `t`, o `t="n"`: numérica -- incluidas las fechas, que
  // `.xlsx` guarda como el número de días desde su época propia y solo
  // decora con un formato de visualización (ver `excelSerialAFechaISO`).
  return { columna, celda: { valor: Number(valorCrudo), esNumero: true, esTexto: false, esBooleano: false } }
}

function leerHoja(archivos: Record<string, Uint8Array>, ruta: string, nombre: string, cadenas: string[]): HojaLeida {
  const xml = strFromU8(archivos[ruta])
  const filasXml = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)]

  const filasCrudas: CeldaLeida[][] = filasXml.map((m) => {
    const interior = m[1] ?? ''
    const celdas = [...interior.matchAll(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g)].map((c) =>
      celdaDesdeXml(c[0], cadenas),
    )
    const anchoFila = celdas.length === 0 ? 0 : Math.max(...celdas.map((c) => c.columna)) + 1
    const fila: CeldaLeida[] = Array.from({ length: anchoFila }, () => ({
      valor: null,
      esNumero: false,
      esTexto: false,
      esBooleano: false,
    }))
    for (const { columna, celda } of celdas) fila[columna] = celda
    return fila
  })

  const [encabezadoCrudo, ...cuerpo] = filasCrudas
  const encabezados = (encabezadoCrudo ?? []).map((c) => (typeof c.valor === 'string' ? c.valor : String(c.valor ?? '')))
  return { nombre, encabezados, filas: cuerpo }
}

/** Lee el `.xlsx` completo: una `HojaLeida` por hoja, en el orden declarado en el libro. */
export function leerXlsx(buffer: Buffer | Uint8Array): HojaLeida[] {
  const archivos = unzipSync(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
  const cadenas = leerCadenasCompartidas(archivos)
  const relaciones = leerRelaciones(archivos, 'xl/_rels/workbook.xml.rels')

  const workbookXml = strFromU8(archivos['xl/workbook.xml'])
  const hojasDeclaradas = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/g)].map((m) => ({
    nombre: atributo(m[0], 'name') ?? '',
    rId: atributo(m[0], 'r:id') ?? '',
  }))

  return hojasDeclaradas.map(({ nombre, rId }) => {
    const destino = relaciones.get(rId) ?? ''
    const ruta = `xl/${destino}`
    return leerHoja(archivos, ruta, nombre, cadenas)
  })
}

/** Convierte el serial de fecha de Excel (días desde 1899-12-30) a 'YYYY-MM-DD'. */
export function excelSerialAFechaISO(serial: number): string {
  const EPOCA_EXCEL_MS = Date.UTC(1899, 11, 30)
  const fecha = new Date(EPOCA_EXCEL_MS + Math.round(serial) * 86400000)
  return fecha.toISOString().slice(0, 10)
}

/** Convierte una fila (arreglo de celdas) en un objeto indexado por el nombre del encabezado, para asertar por nombre de columna en vez de por posición. */
export function filaComoObjeto(hoja: HojaLeida, fila: CeldaLeida[]): Record<string, CeldaLeida> {
  const objeto: Record<string, CeldaLeida> = {}
  hoja.encabezados.forEach((encabezado, i) => {
    objeto[encabezado] = fila[i] ?? { valor: null, esNumero: false, esTexto: false, esBooleano: false }
  })
  return objeto
}
