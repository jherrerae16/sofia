-- CreateEnum
CREATE TYPE "EstadoAnimal" AS ENUM ('activo', 'vendido', 'muerto', 'robado');

-- CreateEnum
CREATE TYPE "TipoLote" AS ENUM ('ceba', 'leche', 'otros');

-- CreateEnum
CREATE TYPE "MetodoPesaje" AS ENUM ('cinta', 'bascula', 'estimacion');

-- CreateEnum
CREATE TYPE "TipoEventoSanitario" AS ENUM ('vacuna', 'desparasitacion', 'vitamina', 'tratamiento');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "claveHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "vigenteDesde" DATE NOT NULL,
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hectareasUtiles" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "Finca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Potrero" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hectareas" DECIMAL(6,2) NOT NULL,
    "tipoPasto" TEXT,
    "capacidadKg" INTEGER NOT NULL DEFAULT 0,
    "tieneAgua" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,

    CONSTRAINT "Potrero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoLote" NOT NULL,
    "fechaApertura" DATE NOT NULL,
    "fechaCierre" DATE,
    "potreroActualId" TEXT,
    "fechaEntradaPotrero" DATE,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "chapeta" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "raza" TEXT,
    "cruce" TEXT,
    "proveedor" TEXT,
    "fechaEntrada" DATE NOT NULL,
    "edadEntradaMeses" INTEGER,
    "condicionCorporal" INTEGER,
    "pesoEntradaKg" DECIMAL(5,1) NOT NULL,
    "costoEntradaCop" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoAnimal" NOT NULL DEFAULT 'activo',
    "fechaSalida" DATE,
    "motivoSalida" TEXT,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesaje" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "metodo" "MetodoPesaje" NOT NULL,
    "responsable" TEXT NOT NULL,
    "notas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladoEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,

    CONSTRAINT "Pesaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicion" (
    "id" TEXT NOT NULL,
    "pesajeId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "pesoKg" DECIMAL(5,1) NOT NULL,

    CONSTRAINT "Medicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "potreroOrigenId" TEXT,
    "potreroDestinoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoSanitario" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEventoSanitario" NOT NULL,
    "fecha" DATE NOT NULL,
    "producto" TEXT NOT NULL,
    "dosis" TEXT,
    "responsable" TEXT NOT NULL,
    "proximaFecha" DATE,
    "notas" TEXT,
    "animalId" TEXT,
    "loteId" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoSanitario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Parametro_clave_vigenteDesde_idx" ON "Parametro"("clave", "vigenteDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Potrero_nombre_key" ON "Potrero"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_nombre_key" ON "Lote"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_chapeta_key" ON "Animal"("chapeta");

-- CreateIndex
CREATE INDEX "Animal_loteId_estado_idx" ON "Animal"("loteId", "estado");

-- CreateIndex
CREATE INDEX "Pesaje_fecha_idx" ON "Pesaje"("fecha");

-- CreateIndex
CREATE INDEX "Medicion_animalId_idx" ON "Medicion"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicion_pesajeId_animalId_key" ON "Medicion"("pesajeId", "animalId");

-- CreateIndex
CREATE INDEX "Movimiento_loteId_fecha_idx" ON "Movimiento"("loteId", "fecha");

-- CreateIndex
CREATE INDEX "Movimiento_potreroDestinoId_fecha_idx" ON "Movimiento"("potreroDestinoId", "fecha");

-- CreateIndex
CREATE INDEX "EventoSanitario_proximaFecha_idx" ON "EventoSanitario"("proximaFecha");

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_potreroActualId_fkey" FOREIGN KEY ("potreroActualId") REFERENCES "Potrero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_pesajeId_fkey" FOREIGN KEY ("pesajeId") REFERENCES "Pesaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_potreroOrigenId_fkey" FOREIGN KEY ("potreroOrigenId") REFERENCES "Potrero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_potreroDestinoId_fkey" FOREIGN KEY ("potreroDestinoId") REFERENCES "Potrero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoSanitario" ADD CONSTRAINT "EventoSanitario_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoSanitario" ADD CONSTRAINT "EventoSanitario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
