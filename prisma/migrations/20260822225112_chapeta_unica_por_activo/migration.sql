-- DropIndex
-- La chapeta deja de ser única en toda la historia: con dos ciclos de ceba al
-- año, el lote que entra en marzo tiene que poder reutilizar la chapeta 001
-- que el lote de septiembre-febrero liberó al venderse.
DROP INDEX "Animal_chapeta_key";

-- CreateIndex
-- Búsqueda por chapeta sin filtrar por estado (para historial, por ejemplo).
-- No impone ninguna unicidad -- la unicidad vive en el índice parcial de
-- abajo.
CREATE INDEX "Animal_chapeta_idx" ON "Animal"("chapeta");

-- CreateIndex (a mano: Prisma no declara índices únicos parciales de forma
-- nativa en el schema)
--
-- La chapeta es única solo ENTRE LOS ANIMALES ACTIVOS. Una vez que un animal
-- sale -- vendido, muerto o robado -- su chapeta queda libre para un animal
-- nuevo. Postgres admite un índice único con una cláusula WHERE (un "índice
-- parcial"): la restricción de unicidad solo aplica a las filas que cumplen
-- esa condición.
--
-- La garantía la impone la base de datos, no una comprobación previa en el
-- código (`crearAnimales` sí hace una comprobación previa, en
-- src/datos/animales.ts, pero es solo para dar un mensaje de error legible
-- con el lote, la fecha y el último peso del animal en conflicto -- no es lo
-- que garantiza la unicidad). Dos altas simultáneas para la misma chapeta no
-- pueden colarse por una comprobación en memoria que ya pasó para ambas antes
-- de que ninguna hubiera escrito nada: solo una de las dos inserciones puede
-- ganar la carrera contra este índice, y la otra falla con `P2002`. Mismo
-- principio que la guardia `where: { estado: 'activo' }` de `anularPesaje` en
-- src/datos/pesajes.ts y de `registrarSalida` en src/datos/animales.ts: la
-- base de datos, no el proceso de Node, es quien de verdad decide.
CREATE UNIQUE INDEX "Animal_chapeta_activo_key" ON "Animal"("chapeta") WHERE ("estado" = 'activo');
