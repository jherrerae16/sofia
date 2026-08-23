import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { DatosExportacion } from '@/datos/exportacion'
import { construirLibroExcel } from './construirLibro'

/**
 * Un `.xlsx` es un zip de archivos XML. Esta prueba no abre el archivo en
 * Excel (eso lo hace la prueba de navegador, `e2e/exportar.spec.ts`, contra
 * un archivo descargado de verdad) -- lo que verifica aquí, rápido y sin
 * levantar el servidor, es la parte más fácil de romper en silencio: que la
 * celda de un peso quede escrita en el XML como número (sin el atributo
 * `t="s"`/`t="str"` que marca una celda de texto), no como texto con
 * apariencia de número.
 */
function datosDePrueba(): DatosExportacion {
  return {
    animales: [
      {
        chapeta: '001',
        lote: 'Ceba 01',
        sexo: 'macho',
        raza: 'Brahman',
        cruce: null,
        proveedor: null,
        fechaEntrada: '2026-01-05',
        edadEntradaMeses: 8,
        condicionCorporal: null,
        pesoEntradaKg: 182.5,
        costoEntradaCop: 0,
        estado: 'Activo',
        fechaSalida: null,
        motivoSalida: null,
        pesoSalidaKg: null,
      },
    ],
    pesajes: [],
    lotes: [],
    potreros: [],
    movimientos: [],
    novedades: [],
    eventos: [],
    parametros: [],
  }
}

/**
 * XML crudo de una hoja, resuelto por NOMBRE (no por posición): así la
 * prueba no se rompe el día que otra hoja se agregue o se quite del libro
 * (como la portada, que corre el número de las demás en un commit aparte).
 */
function xmlDeHoja(archivos: Record<string, Uint8Array>, nombreHoja: string): string {
  const workbook = strFromU8(archivos['xl/workbook.xml'])
  const declaracion = [...workbook.matchAll(/<sheet\b[^>]*\/>/g)]
    .map((m) => m[0])
    .find((etiqueta) => atributo(etiqueta, 'name') === nombreHoja)
  if (!declaracion) throw new Error(`No se encontró la hoja "${nombreHoja}".`)

  const rId = atributo(declaracion, 'r:id')
  const rels = strFromU8(archivos['xl/_rels/workbook.xml.rels'])
  const relacion = [...rels.matchAll(/<Relationship\b[^>]*\/>/g)]
    .map((m) => m[0])
    .find((etiqueta) => atributo(etiqueta, 'Id') === rId)
  const destino = relacion && atributo(relacion, 'Target')
  if (!destino) throw new Error(`No se encontró la relación "${rId}" para la hoja "${nombreHoja}".`)

  return strFromU8(archivos[`xl/${destino}`])
}

function atributo(etiqueta: string, nombre: string): string | null {
  return etiqueta.match(new RegExp(`${nombre}="([^"]*)"`))?.[1] ?? null
}

function celda(xmlHoja: string, referencia: string): string | undefined {
  return xmlHoja.match(new RegExp(`<c r="${referencia}"[^>]*>[\\s\\S]*?</c>`))?.[0]
}

function valorNumerico(xmlCelda: string | undefined): number {
  const valor = xmlCelda?.match(/<v>([\s\S]*?)<\/v>/)?.[1]
  if (valor === undefined) throw new Error('Celda sin valor numérico.')
  return Number(valor)
}

/** Un `.xlsx` guarda fechas como días (fraccionarios, para la hora) desde 1899-12-30. */
function serialAFechaHoraUtc(serial: number): Date {
  const EPOCA_EXCEL_MS = Date.UTC(1899, 11, 30)
  return new Date(EPOCA_EXCEL_MS + Math.round(serial * 86_400_000))
}

describe('construirLibroExcel', () => {
  // El revisor encontró el caso exacto: un parámetro creado a las 20:52 hora
  // de Bogotá (UTC-5) el 22 de agosto quedaba escrito en el archivo como
  // 2026-08-23 01:52 -- el DÍA SIGUIENTE, porque la celda se escribía en
  // UTC mientras el resto del archivo (fechas de día, nombre del archivo)
  // usa hora de la finca. La prueba tiene que cruzar la medianoche de
  // Bogotá: con una hora cualquiera del día, pasaría igual con y sin el
  // arreglo.
  it('escribe las fechas de anulación y de creación en hora de la finca, no en UTC', async () => {
    const instante = new Date('2026-08-23T01:52:00.000Z')
    const base = datosDePrueba()
    const datos: DatosExportacion = {
      ...base,
      pesajes: [
        {
          fecha: '2026-02-01',
          chapeta: '010',
          lote: 'Ceba 01',
          pesoKg: 220,
          metodo: 'báscula',
          responsable: 'Pedro',
          notas: null,
          registradoPor: null,
          anuladoEn: instante,
          motivoAnulacion: 'Báscula descalibrada',
          anuladoPor: null,
        },
      ],
      potreros: [
        {
          nombre: 'El Jobo',
          hectareas: 5,
          tipoPasto: null,
          capacidadKg: 5000,
          tieneAgua: true,
          notas: null,
          anuladoEn: instante,
          motivoAnulacion: 'Se vendió el lote de tierra',
        },
      ],
      novedades: [
        {
          tipo: 'Hecho puntual',
          descripcion: 'Se arregló el bebedero',
          fecha: '2026-02-01',
          fechaFin: null,
          lote: null,
          potrero: null,
          registradoPor: null,
          anuladoEn: instante,
          motivoAnulacion: 'Se digitó mal',
          anuladoPor: null,
        },
      ],
      parametros: [
        { clave: 'umbral_bajo', valor: 400, vigenteDesde: '2026-01-01', creadoEn: instante, creadoPor: null },
      ],
    }

    const buffer = await construirLibroExcel(datos)
    const archivos = unzipSync(new Uint8Array(buffer))

    // Referencia de celda de cada columna "Fecha de anulación"/"Creado en"
    // en la fila 2 (la 1 es el encabezado) de su hoja.
    const casos: { hoja: string; referencia: string }[] = [
      { hoja: 'Pesajes', referencia: 'L2' },
      { hoja: 'Potreros', referencia: 'G2' },
      { hoja: 'Novedades', referencia: 'K2' },
      { hoja: 'Parámetros', referencia: 'D2' },
    ]

    for (const { hoja, referencia } of casos) {
      const serial = valorNumerico(celda(xmlDeHoja(archivos, hoja), referencia))
      const fechaHoraUtc = serialAFechaHoraUtc(serial)
      // 2026-08-22 20:52 hora de Bogotá, NO 2026-08-23 01:52 (que es lo que
      // saldría si la celda se quedara en UTC sin convertir).
      expect(
        [
          fechaHoraUtc.getUTCFullYear(),
          fechaHoraUtc.getUTCMonth(),
          fechaHoraUtc.getUTCDate(),
          fechaHoraUtc.getUTCHours(),
          fechaHoraUtc.getUTCMinutes(),
        ],
        `hoja "${hoja}", celda ${referencia}`,
      ).toEqual([2026, 7, 22, 20, 52])
    }
  })

  it('produce un .xlsx real (zip con las 8 hojas) con la celda del peso guardada como número', async () => {
    const buffer = await construirLibroExcel(datosDePrueba())

    // Firma de archivo ZIP: cualquier .xlsx (y cualquier .docx, .zip, etc)
    // empieza con estos dos bytes ("PK"). Si esto falla, no se generó un
    // zip -- ni vale la pena seguir mirando el resto.
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK')

    const archivos = unzipSync(new Uint8Array(buffer))
    const nombresHoja = Object.keys(archivos).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    expect(nombresHoja).toHaveLength(8)

    const workbook = strFromU8(archivos['xl/workbook.xml'])
    for (const nombre of [
      'Animales',
      'Pesajes',
      'Lotes',
      'Potreros',
      'Movimientos',
      'Novedades',
      'Eventos sanitarios',
      'Parámetros',
    ]) {
      expect(workbook).toContain(`name="${nombre}"`)
    }

    // La hoja de Animales es la primera declarada -> sheet1.xml. La fila 2
    // (la 1 es el encabezado) trae, en la columna J, el peso de entrada
    // (180.5, décima columna: Chapeta, Lote, Sexo, Raza, Cruce, Proveedor,
    // Fecha de entrada, Edad, Condición corporal, Peso de entrada).
    const hojaAnimales = strFromU8(archivos['xl/worksheets/sheet1.xml'])
    const celdaPeso = hojaAnimales.match(/<c r="J2"[^>]*>[\s\S]*?<\/c>/)?.[0]
    expect(celdaPeso).toBeDefined()
    // Sin atributo `t`, o `t="n"`: las dos formas en que un `.xlsx` marca una
    // celda numérica. `t="s"` (cadena compartida) o `t="str"` (fórmula de
    // texto) es justo el defecto que esta prueba existe para atrapar.
    expect(celdaPeso).not.toMatch(/t="(s|str|inlineStr)"/)
    expect(celdaPeso).toMatch(/<v>182\.5<\/v>/)
  })
})
