-- Mueve `hectareasUtiles` del modelo `Finca` (un campo suelto que se
-- sobreescribía sin vigencia, sin autor y sin fecha) al modelo `Parametro`,
-- bajo la clave 'hectareas_utiles' -- exactamente el mismo mecanismo que ya
-- usan los otros seis parámetros de la finca. Antes de este cambio, corregir
-- las hectáreas útiles (por ejemplo tras desmontar un potrero) recalculaba
-- hacia atrás la carga animal de ciclos ya cerrados, porque no quedaba
-- registro de qué valor regía en qué fecha.
--
-- El valor que ya tenía la finca real no se puede perder: esta migración lo
-- traslada a una fila de `Parametro` ANTES de borrar la columna. La fecha de
-- vigencia es un ancla deliberadamente antigua (no la fecha real en que se
-- sembró ese valor, que nunca se guardó en ningún lado) para garantizar que
-- ya haya pasado sin importar cuándo se aplique esta migración -- así la
-- carga animal de hoy sigue calculándose exactamente igual que antes de este
-- cambio. Si algún día se necesita saber desde cuándo regía de verdad el
-- valor anterior, esa información ya se había perdido antes de esta
-- migración: `Finca.hectareasUtiles` nunca guardó una fecha.
--
-- Si la finca todavía no existe (una base recién creada, antes del seed),
-- este SELECT no trae filas y el INSERT no hace nada -- no es un error.
INSERT INTO "Parametro" ("id", "clave", "valor", "vigenteDesde", "creadoPorId", "creadoEn")
SELECT
  gen_random_uuid()::text,
  'hectareas_utiles',
  "hectareasUtiles"::text,
  '2000-01-01'::date,
  NULL,
  CURRENT_TIMESTAMP
FROM "Finca";

-- AlterTable
ALTER TABLE "Finca" DROP COLUMN "hectareasUtiles";
