-- CreateEnum
CREATE TYPE "TipoNovedad" AS ENUM ('hecho', 'suministro');

-- CreateTable
CREATE TABLE "Novedad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "fechaFin" DATE,
    "loteId" TEXT,
    "potreroId" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladoEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "anuladoPorId" TEXT,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Novedad_fecha_idx" ON "Novedad"("fecha");

-- CreateIndex
CREATE INDEX "Novedad_loteId_tipo_fechaFin_idx" ON "Novedad"("loteId", "tipo", "fechaFin");

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_potreroId_fkey" FOREIGN KEY ("potreroId") REFERENCES "Potrero"("id") ON DELETE SET NULL ON UPDATE CASCADE;
