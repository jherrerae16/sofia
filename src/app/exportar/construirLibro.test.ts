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

describe('construirLibroExcel', () => {
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
