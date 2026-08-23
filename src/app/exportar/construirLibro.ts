import writeXlsxFile, { getSheetData, type Cell, type Column, type SheetData } from 'write-excel-file/node'
import { aFechaHoraBogota } from '@/calc/fechas'
import type {
  DatosExportacion,
  FilaAnimalExport,
  FilaEventoExport,
  FilaLoteExport,
  FilaMovimientoExport,
  FilaNovedadExport,
  FilaParametroExport,
  FilaPesajeExport,
  FilaPotreroExport,
} from '@/datos/exportacion'

const FORMATO_FECHA = 'yyyy-mm-dd'
const FORMATO_FECHA_HORA = 'yyyy-mm-dd hh:mm'
const FORMATO_NUMERO = '#,##0'
const FORMATO_UN_DECIMAL = '#,##0.0'

/** `Cell` con la fecha en blanco cuando es null, en vez de forzar cada columna a repetir el condicional. */
function celdaFecha(fecha: string | null): Cell {
  if (fecha === null) return null
  return { value: new Date(`${fecha}T00:00:00.000Z`), type: Date, format: FORMATO_FECHA }
}

function celdaFechaHora(fecha: Date | null): Cell {
  if (fecha === null) return null
  return { value: aFechaHoraBogota(fecha), type: Date, format: FORMATO_FECHA_HORA }
}

function celdaTexto(texto: string | null): Cell {
  return texto
}

function celdaNumero(numero: number | null, format = FORMATO_UN_DECIMAL): Cell {
  if (numero === null) return null
  return { value: numero, type: Number, format }
}

function columnaAncha(header: string, width = 22): { header: Cell; width: number } {
  return { header: { value: header, fontWeight: 'bold' }, width }
}

const COLUMNAS_ANIMALES: Column<FilaAnimalExport>[] = [
  { ...columnaAncha('Chapeta', 12), cell: (f) => celdaTexto(f.chapeta) },
  { ...columnaAncha('Lote'), cell: (f) => celdaTexto(f.lote) },
  { ...columnaAncha('Sexo', 10), cell: (f) => celdaTexto(f.sexo) },
  { ...columnaAncha('Raza', 16), cell: (f) => celdaTexto(f.raza) },
  { ...columnaAncha('Cruce', 16), cell: (f) => celdaTexto(f.cruce) },
  { ...columnaAncha('Proveedor', 20), cell: (f) => celdaTexto(f.proveedor) },
  { ...columnaAncha('Fecha de entrada', 16), cell: (f) => celdaFecha(f.fechaEntrada) },
  { ...columnaAncha('Edad de entrada (meses)', 20), cell: (f) => celdaNumero(f.edadEntradaMeses, FORMATO_NUMERO) },
  { ...columnaAncha('Condición corporal', 18), cell: (f) => celdaNumero(f.condicionCorporal, FORMATO_NUMERO) },
  { ...columnaAncha('Peso de entrada (kg)', 18), cell: (f) => celdaNumero(f.pesoEntradaKg) },
  { ...columnaAncha('Costo de entrada (COP)', 20), cell: (f) => celdaNumero(f.costoEntradaCop, FORMATO_NUMERO) },
  { ...columnaAncha('Estado', 12), cell: (f) => celdaTexto(f.estado) },
  { ...columnaAncha('Fecha de salida', 16), cell: (f) => celdaFecha(f.fechaSalida) },
  { ...columnaAncha('Motivo de salida', 24), cell: (f) => celdaTexto(f.motivoSalida) },
  { ...columnaAncha('Peso de salida (kg)', 18), cell: (f) => celdaNumero(f.pesoSalidaKg) },
]

const COLUMNAS_PESAJES: Column<FilaPesajeExport>[] = [
  { ...columnaAncha('Fecha', 14), cell: (f) => celdaFecha(f.fecha) },
  { ...columnaAncha('Chapeta', 12), cell: (f) => celdaTexto(f.chapeta) },
  { ...columnaAncha('Lote'), cell: (f) => celdaTexto(f.lote) },
  { ...columnaAncha('Peso (kg)', 14), cell: (f) => celdaNumero(f.pesoKg) },
  { ...columnaAncha('Método', 20), cell: (f) => celdaTexto(f.metodo) },
  { ...columnaAncha('Responsable', 18), cell: (f) => celdaTexto(f.responsable) },
  { ...columnaAncha('Notas', 28), cell: (f) => celdaTexto(f.notas) },
  { ...columnaAncha('Registrado por', 18), cell: (f) => celdaTexto(f.registradoPor) },
  { ...columnaAncha('Anulado', 10), cell: (f) => celdaTexto(f.anuladoEn ? 'Sí' : '') },
  { ...columnaAncha('Motivo de anulación', 26), cell: (f) => celdaTexto(f.motivoAnulacion) },
  { ...columnaAncha('Anulado por', 18), cell: (f) => celdaTexto(f.anuladoPor) },
  { ...columnaAncha('Fecha de anulación', 18), cell: (f) => celdaFechaHora(f.anuladoEn) },
]

const COLUMNAS_LOTES: Column<FilaLoteExport>[] = [
  { ...columnaAncha('Nombre', 16), cell: (f) => celdaTexto(f.nombre) },
  { ...columnaAncha('Tipo', 12), cell: (f) => celdaTexto(f.tipo) },
  { ...columnaAncha('Fecha de apertura', 16), cell: (f) => celdaFecha(f.fechaApertura) },
  { ...columnaAncha('Fecha de cierre', 16), cell: (f) => celdaFecha(f.fechaCierre) },
  { ...columnaAncha('Potrero actual', 18), cell: (f) => celdaTexto(f.potreroActual) },
  { ...columnaAncha('Fecha de entrada al potrero', 22), cell: (f) => celdaFecha(f.fechaEntradaPotrero) },
  { ...columnaAncha('Animales activos', 16), cell: (f) => celdaNumero(f.animalesActivos, FORMATO_NUMERO) },
]

const COLUMNAS_POTREROS: Column<FilaPotreroExport>[] = [
  { ...columnaAncha('Nombre', 16), cell: (f) => celdaTexto(f.nombre) },
  { ...columnaAncha('Hectáreas', 12), cell: (f) => celdaNumero(f.hectareas) },
  { ...columnaAncha('Tipo de pasto', 18), cell: (f) => celdaTexto(f.tipoPasto) },
  { ...columnaAncha('Capacidad (kg)', 16), cell: (f) => celdaNumero(f.capacidadKg, FORMATO_NUMERO) },
  { ...columnaAncha('Tiene agua', 12), cell: (f) => ({ value: f.tieneAgua, type: Boolean }) },
  { ...columnaAncha('Notas', 28), cell: (f) => celdaTexto(f.notas) },
  { ...columnaAncha('Anulado en', 18), cell: (f) => celdaFechaHora(f.anuladoEn) },
  { ...columnaAncha('Motivo de anulación', 26), cell: (f) => celdaTexto(f.motivoAnulacion) },
]

const COLUMNAS_MOVIMIENTOS: Column<FilaMovimientoExport>[] = [
  { ...columnaAncha('Fecha', 14), cell: (f) => celdaFecha(f.fecha) },
  { ...columnaAncha('Lote'), cell: (f) => celdaTexto(f.lote) },
  { ...columnaAncha('Potrero de origen', 18), cell: (f) => celdaTexto(f.potreroOrigen) },
  { ...columnaAncha('Potrero de destino', 18), cell: (f) => celdaTexto(f.potreroDestino) },
  { ...columnaAncha('Registrado por', 18), cell: (f) => celdaTexto(f.registradoPor) },
]

const COLUMNAS_NOVEDADES: Column<FilaNovedadExport>[] = [
  { ...columnaAncha('Tipo', 20), cell: (f) => celdaTexto(f.tipo) },
  { ...columnaAncha('Descripción', 36), cell: (f) => celdaTexto(f.descripcion) },
  { ...columnaAncha('Fecha', 14), cell: (f) => celdaFecha(f.fecha) },
  { ...columnaAncha('Fecha fin', 14), cell: (f) => celdaFecha(f.fechaFin) },
  { ...columnaAncha('Lote'), cell: (f) => celdaTexto(f.lote) },
  { ...columnaAncha('Potrero', 18), cell: (f) => celdaTexto(f.potrero) },
  { ...columnaAncha('Registrado por', 18), cell: (f) => celdaTexto(f.registradoPor) },
  { ...columnaAncha('Anulada', 10), cell: (f) => celdaTexto(f.anuladoEn ? 'Sí' : '') },
  { ...columnaAncha('Motivo de anulación', 26), cell: (f) => celdaTexto(f.motivoAnulacion) },
  { ...columnaAncha('Anulada por', 18), cell: (f) => celdaTexto(f.anuladoPor) },
  { ...columnaAncha('Fecha de anulación', 18), cell: (f) => celdaFechaHora(f.anuladoEn) },
]

const COLUMNAS_EVENTOS: Column<FilaEventoExport>[] = [
  { ...columnaAncha('Tipo', 18), cell: (f) => celdaTexto(f.tipo) },
  { ...columnaAncha('Fecha', 14), cell: (f) => celdaFecha(f.fecha) },
  { ...columnaAncha('Producto', 20), cell: (f) => celdaTexto(f.producto) },
  { ...columnaAncha('Dosis', 12), cell: (f) => celdaTexto(f.dosis) },
  { ...columnaAncha('Responsable', 18), cell: (f) => celdaTexto(f.responsable) },
  { ...columnaAncha('Próxima fecha', 16), cell: (f) => celdaFecha(f.proximaFecha) },
  { ...columnaAncha('Notas', 28), cell: (f) => celdaTexto(f.notas) },
  { ...columnaAncha('Chapeta', 12), cell: (f) => celdaTexto(f.chapeta) },
  { ...columnaAncha('Lote del animal', 18), cell: (f) => celdaTexto(f.loteAnimal) },
  { ...columnaAncha('Lote del evento', 18), cell: (f) => celdaTexto(f.lote) },
  { ...columnaAncha('Registrado por', 18), cell: (f) => celdaTexto(f.registradoPor) },
]

const COLUMNAS_PARAMETROS: Column<FilaParametroExport>[] = [
  { ...columnaAncha('Clave', 24), cell: (f) => celdaTexto(f.clave) },
  {
    ...columnaAncha('Valor', 14),
    // El valor de un parámetro casi siempre es numérico, pero
    // `valorParametroExport` puede haber dejado un texto si lo guardado no
    // era un número -- de ahí que esta celda, a diferencia de las demás
    // columnas numéricas, decida su tipo fila por fila.
    cell: (f) => (typeof f.valor === 'number' ? { value: f.valor, type: Number, format: FORMATO_UN_DECIMAL } : f.valor),
  },
  { ...columnaAncha('Vigente desde', 16), cell: (f) => celdaFecha(f.vigenteDesde) },
  { ...columnaAncha('Creado en', 18), cell: (f) => celdaFechaHora(f.creadoEn) },
  { ...columnaAncha('Creado por', 18), cell: (f) => celdaTexto(f.creadoPor) },
]

/**
 * Arma el libro de Excel completo -- una hoja por cosa, en el mismo orden en
 * que aparecen en `DatosExportacion` -- y lo entrega como un `Buffer` listo
 * para servirse como descarga. `write-excel-file` se eligió por dos razones:
 * escribe tipos de celda reales (un número queda guardado como número en el
 * XML del `.xlsx`, no como texto con apariencia de número, que es el defecto
 * que este archivo existe para evitar), y no arrastra ninguna vulnerabilidad
 * conocida -- su único dependencia es `fflate` (cero dependencias propias,
 * sin avisos abiertos), a diferencia de la librería más popular del
 * ecosistema (`xlsx`/SheetJS), cuya versión publicada en npm sí tiene
 * vulnerabilidades conocidas sin parchear (prototype pollution y ReDoS).
 */
export async function construirLibroExcel(datos: DatosExportacion): Promise<Buffer> {
  return writeXlsxFile([
    hoja('Animales', datos.animales, COLUMNAS_ANIMALES),
    hoja('Pesajes', datos.pesajes, COLUMNAS_PESAJES),
    hoja('Lotes', datos.lotes, COLUMNAS_LOTES),
    hoja('Potreros', datos.potreros, COLUMNAS_POTREROS),
    hoja('Movimientos', datos.movimientos, COLUMNAS_MOVIMIENTOS),
    hoja('Novedades', datos.novedades, COLUMNAS_NOVEDADES),
    hoja('Eventos sanitarios', datos.eventos, COLUMNAS_EVENTOS),
    hoja('Parámetros', datos.parametros, COLUMNAS_PARAMETROS),
  ]).toBuffer()
}

/**
 * La sobrecarga de `writeXlsxFile` para varias hojas exige `data` ya resuelta
 * a filas de celdas (`SheetData`), no objetos con columnas -- esa comodidad
 * solo existe en la sobrecarga de una sola hoja. `getSheetData`, que la
 * propia librería exporta, es el puente entre las dos: aplica cada `Column`
 * (encabezado y `cell`) a la lista de objetos y devuelve la fila de
 * encabezado más una fila por dato. El ancho de columna, en cambio, sí es una
 * opción de hoja (`SheetOptions.columns`, solo anchos) y no viaja dentro de
 * `SheetData` -- se deriva aquí de la misma definición de columnas para no
 * mantener los anchos por duplicado.
 */
function hoja<T>(nombre: string, filas: T[], columnas: Column<T>[]): { sheet: string; data: SheetData; columns: { width?: number }[]; stickyRowsCount: number } {
  return {
    sheet: nombre,
    data: getSheetData(filas, columnas),
    columns: columnas.map((columna) => ({ width: columna.width })),
    stickyRowsCount: 1,
  }
}
