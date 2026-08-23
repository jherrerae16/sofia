import type { FechaISO } from '@/calc/tipos'
import {
  ETIQUETA_ESTADO_ANIMAL,
  ETIQUETA_METODO_PESAJE,
  ETIQUETA_TIPO_EVENTO,
  ETIQUETA_TIPO_LOTE,
  ETIQUETA_TIPO_NOVEDAD,
} from '@/ui/etiquetas'
import { prisma } from './cliente'
import { aFechaISO, aNumero } from './conversion'

export type FilaAnimalExport = {
  chapeta: string
  lote: string
  sexo: string
  raza: string | null
  cruce: string | null
  proveedor: string | null
  fechaEntrada: FechaISO
  edadEntradaMeses: number | null
  condicionCorporal: number | null
  pesoEntradaKg: number
  costoEntradaCop: number
  estado: string
  fechaSalida: FechaISO | null
  motivoSalida: string | null
  pesoSalidaKg: number | null
}

export type FilaPesajeExport = {
  fecha: FechaISO
  chapeta: string
  lote: string
  pesoKg: number
  metodo: string
  responsable: string
  notas: string | null
  registradoPor: string | null
  anuladoEn: Date | null
  motivoAnulacion: string | null
  anuladoPor: string | null
}

export type FilaLoteExport = {
  nombre: string
  tipo: string
  fechaApertura: FechaISO
  fechaCierre: FechaISO | null
  potreroActual: string | null
  fechaEntradaPotrero: FechaISO | null
}

export type FilaPotreroExport = {
  nombre: string
  hectareas: number
  tipoPasto: string | null
  capacidadKg: number
  tieneAgua: boolean
  notas: string | null
  anuladoEn: Date | null
  motivoAnulacion: string | null
}

export type FilaMovimientoExport = {
  fecha: FechaISO
  lote: string
  potreroOrigen: string | null
  potreroDestino: string
  registradoPor: string | null
}

export type FilaNovedadExport = {
  tipo: string
  descripcion: string
  fecha: FechaISO
  fechaFin: FechaISO | null
  lote: string | null
  potrero: string | null
  registradoPor: string | null
  anuladoEn: Date | null
  motivoAnulacion: string | null
  anuladoPor: string | null
}

export type FilaEventoExport = {
  tipo: string
  fecha: FechaISO
  producto: string
  dosis: string | null
  responsable: string
  proximaFecha: FechaISO | null
  notas: string | null
  chapeta: string | null
  /**
   * El lote del ANIMAL al que se aplicó el evento, distinto de `lote` (el
   * lote DEL EVENTO, que solo se llena cuando el evento se registró para un
   * lote entero). Existe porque la chapeta solo es única entre los animales
   * activos: dos ciclos de ceba al año pueden tener, cada uno, un animal con
   * la misma chapeta, y sin este campo dos filas con "Chapeta 101" son
   * indistinguibles.
   */
  loteAnimal: string | null
  lote: string | null
  registradoPor: string | null
}

export type FilaParametroExport = {
  clave: string
  valor: number | string
  vigenteDesde: FechaISO
  creadoEn: Date
  creadoPor: string | null
}

export type DatosExportacion = {
  animales: FilaAnimalExport[]
  pesajes: FilaPesajeExport[]
  lotes: FilaLoteExport[]
  potreros: FilaPotreroExport[]
  movimientos: FilaMovimientoExport[]
  novedades: FilaNovedadExport[]
  eventos: FilaEventoExport[]
  parametros: FilaParametroExport[]
}

/**
 * El valor de un parámetro se guarda siempre como texto (ver
 * `src/datos/parametros.ts`), pero en la práctica es un número -- un umbral,
 * un objetivo, unas hectáreas. Se convierte aquí para que la celda de Excel
 * sea numérica de verdad; si alguna vez quedó guardado un valor que no es un
 * número (la misma situación que ya tolera la pantalla de Configuración), se
 * conserva tal cual como texto en vez de inventar un cero.
 */
function valorParametroExport(valor: string): number | string {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : valor
}

/**
 * Reúne, sin filtrar nada, todo lo que hay en las ocho tablas operativas de
 * la finca -- lo activo y lo que ya salió, lo abierto y lo cerrado, lo
 * vigente y lo anulado. Es la única puerta de lectura para el botón
 * "Exportar todo a Excel" (`src/app/exportar/route.ts`): un respaldo que
 * usara las mismas consultas filtradas que ya usan las pantallas (por
 * ejemplo `listarPotreros`, que oculta los anulados, o `listarLotes`, que
 * oculta los cerrados) dejaría afuera justo la parte de la historia que un
 * respaldo existe para conservar.
 *
 * Las relaciones vienen resueltas a nombre -- el lote de cada animal, los
 * potreros de cada movimiento, quién registró y quién anuló cada cosa --
 * porque un archivo lleno de identificadores internos no le sirve a nadie
 * que abra este Excel fuera de la plataforma.
 */
export async function datosExportacionCompleta(): Promise<DatosExportacion> {
  const usuarios = new Map((await prisma.usuario.findMany({ select: { id: true, nombre: true } })).map(
    (usuario) => [usuario.id, usuario.nombre],
  ))
  const nombreUsuario = (id: string | null): string | null => (id === null ? null : (usuarios.get(id) ?? id))

  const [animales, mediciones, lotes, potreros, movimientos, novedades, eventos, parametros] = await Promise.all([
    prisma.animal.findMany({
      include: { lote: { select: { nombre: true } } },
      orderBy: [{ chapeta: 'asc' }, { fechaEntrada: 'asc' }],
    }),
    prisma.medicion.findMany({
      include: {
        pesaje: true,
        animal: { include: { lote: { select: { nombre: true } } } },
      },
      orderBy: [{ pesaje: { fecha: 'asc' } }, { animal: { chapeta: 'asc' } }],
    }),
    prisma.lote.findMany({
      include: { potreroActual: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    }),
    prisma.potrero.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.movimiento.findMany({
      include: {
        lote: { select: { nombre: true } },
        potreroOrigen: { select: { nombre: true } },
        potreroDestino: { select: { nombre: true } },
      },
      orderBy: { fecha: 'asc' },
    }),
    prisma.novedad.findMany({
      include: { lote: { select: { nombre: true } }, potrero: { select: { nombre: true } } },
      orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
    }),
    prisma.eventoSanitario.findMany({
      include: {
        animal: { select: { chapeta: true, lote: { select: { nombre: true } } } },
        lote: { select: { nombre: true } },
      },
      orderBy: { fecha: 'asc' },
    }),
    prisma.parametro.findMany({ orderBy: [{ clave: 'asc' }, { vigenteDesde: 'asc' }, { creadoEn: 'asc' }] }),
  ])

  return {
    animales: animales.map((animal) => ({
      chapeta: animal.chapeta,
      lote: animal.lote.nombre,
      sexo: animal.sexo,
      raza: animal.raza,
      cruce: animal.cruce,
      proveedor: animal.proveedor,
      fechaEntrada: aFechaISO(animal.fechaEntrada),
      edadEntradaMeses: animal.edadEntradaMeses,
      condicionCorporal: animal.condicionCorporal,
      pesoEntradaKg: aNumero(animal.pesoEntradaKg),
      costoEntradaCop: animal.costoEntradaCop,
      estado: ETIQUETA_ESTADO_ANIMAL[animal.estado],
      fechaSalida: animal.fechaSalida ? aFechaISO(animal.fechaSalida) : null,
      motivoSalida: animal.motivoSalida,
      pesoSalidaKg: animal.pesoSalidaKg ? aNumero(animal.pesoSalidaKg) : null,
    })),

    pesajes: mediciones.map((medicion) => ({
      fecha: aFechaISO(medicion.pesaje.fecha),
      chapeta: medicion.animal.chapeta,
      lote: medicion.animal.lote.nombre,
      pesoKg: aNumero(medicion.pesoKg),
      metodo: ETIQUETA_METODO_PESAJE[medicion.pesaje.metodo],
      responsable: medicion.pesaje.responsable,
      notas: medicion.pesaje.notas,
      registradoPor: nombreUsuario(medicion.pesaje.registradoPorId),
      anuladoEn: medicion.pesaje.anuladoEn,
      motivoAnulacion: medicion.pesaje.motivoAnulacion,
      anuladoPor: nombreUsuario(medicion.pesaje.anuladoPorId),
    })),

    lotes: lotes.map((lote) => ({
      nombre: lote.nombre,
      tipo: ETIQUETA_TIPO_LOTE[lote.tipo],
      fechaApertura: aFechaISO(lote.fechaApertura),
      fechaCierre: lote.fechaCierre ? aFechaISO(lote.fechaCierre) : null,
      potreroActual: lote.potreroActual?.nombre ?? null,
      fechaEntradaPotrero: lote.fechaEntradaPotrero ? aFechaISO(lote.fechaEntradaPotrero) : null,
    })),

    potreros: potreros.map((potrero) => ({
      nombre: potrero.nombre,
      hectareas: aNumero(potrero.hectareas),
      tipoPasto: potrero.tipoPasto,
      capacidadKg: potrero.capacidadKg,
      tieneAgua: potrero.tieneAgua,
      notas: potrero.notas,
      anuladoEn: potrero.anuladoEn,
      motivoAnulacion: potrero.motivoAnulacion,
    })),

    movimientos: movimientos.map((movimiento) => ({
      fecha: aFechaISO(movimiento.fecha),
      lote: movimiento.lote.nombre,
      potreroOrigen: movimiento.potreroOrigen?.nombre ?? null,
      potreroDestino: movimiento.potreroDestino.nombre,
      registradoPor: nombreUsuario(movimiento.registradoPorId),
    })),

    novedades: novedades.map((novedad) => ({
      tipo: ETIQUETA_TIPO_NOVEDAD[novedad.tipo],
      descripcion: novedad.descripcion,
      fecha: aFechaISO(novedad.fecha),
      fechaFin: novedad.fechaFin ? aFechaISO(novedad.fechaFin) : null,
      lote: novedad.lote?.nombre ?? null,
      potrero: novedad.potrero?.nombre ?? null,
      registradoPor: nombreUsuario(novedad.registradoPorId),
      anuladoEn: novedad.anuladoEn,
      motivoAnulacion: novedad.motivoAnulacion,
      anuladoPor: nombreUsuario(novedad.anuladoPorId),
    })),

    eventos: eventos.map((evento) => ({
      tipo: ETIQUETA_TIPO_EVENTO[evento.tipo],
      fecha: aFechaISO(evento.fecha),
      producto: evento.producto,
      dosis: evento.dosis,
      responsable: evento.responsable,
      proximaFecha: evento.proximaFecha ? aFechaISO(evento.proximaFecha) : null,
      notas: evento.notas,
      chapeta: evento.animal?.chapeta ?? null,
      loteAnimal: evento.animal?.lote.nombre ?? null,
      lote: evento.lote?.nombre ?? null,
      registradoPor: nombreUsuario(evento.registradoPorId),
    })),

    parametros: parametros.map((parametro) => ({
      clave: parametro.clave,
      valor: valorParametroExport(parametro.valor),
      vigenteDesde: aFechaISO(parametro.vigenteDesde),
      creadoEn: parametro.creadoEn,
      creadoPor: nombreUsuario(parametro.creadoPorId),
    })),
  }
}
