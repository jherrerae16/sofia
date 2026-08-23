/*
  Warnings:

  - Made the column `animalId` on table `EventoSanitario` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "EventoSanitario" DROP CONSTRAINT "EventoSanitario_animalId_fkey";

-- Traslado de los eventos que colgaban del lote a una fila por animal.
--
-- Una fila apuntando solo al lote no dice a qué animales se les aplicó de
-- verdad: la ficha del animal la resolvía leyendo el lote ACTUAL del animal y
-- sin mirar fechas. Un novillo que entró en agosto aparecía con la vacuna que
-- el lote recibió en abril, y al pasarlo de lote perdía las suyas. Se expande
-- cada fila de lote a los animales que ya estaban en ese lote el día de la
-- aplicación (`fechaEntrada <= fecha`); el `loteId` se conserva como rastro
-- de que fue una aplicación en tanda.
INSERT INTO "EventoSanitario" (
  "id", "tipo", "fecha", "producto", "dosis", "responsable",
  "proximaFecha", "notas", "animalId", "loteId", "registradoPorId", "creadoEn"
)
SELECT
  'mig' || md5(e."id" || a."id"),
  e."tipo", e."fecha", e."producto", e."dosis", e."responsable",
  e."proximaFecha", e."notas", a."id", e."loteId", e."registradoPorId", e."creadoEn"
FROM "EventoSanitario" e
JOIN "Animal" a ON a."loteId" = e."loteId" AND a."fechaEntrada" <= e."fecha"
WHERE e."animalId" IS NULL;

DELETE FROM "EventoSanitario" WHERE "animalId" IS NULL;

-- AlterTable
ALTER TABLE "EventoSanitario" ALTER COLUMN "animalId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "EventoSanitario_animalId_tipo_fecha_idx" ON "EventoSanitario"("animalId", "tipo", "fecha");

-- AddForeignKey
ALTER TABLE "EventoSanitario" ADD CONSTRAINT "EventoSanitario_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
