-- Las cuentas dejan de entrar con correo y clave guardada en la base: son dos
-- usuarios fijos (src/usuarios.ts) cuya clave vive en una variable de entorno.
-- La tabla se queda para que cada registro siga sabiendo quién lo anotó.
ALTER TABLE "Usuario" RENAME COLUMN "correo" TO "usuario";
ALTER TABLE "Usuario" DROP COLUMN "claveHash";
ALTER INDEX "Usuario_correo_key" RENAME TO "Usuario_usuario_key";
