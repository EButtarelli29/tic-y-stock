-- Migración 05: cierre de solicitudes (F8 — T-42 a T-46).
--
-- Para bases nuevas no hace falta: `db/schema.sql` ya trae las columnas.
-- Para bases ya instaladas (las del equipo, la del taller), correr:
--
--     & 'C:\xampp\mysql\bin\mysql.exe' -u root --default-character-set=utf8mb4 -e "source db/migracion-05-solicitudes.sql"
--
-- La tabla `solicitudes` existe desde F1 (T-06), pero nació como un registro
-- mínimo: quién, qué y en qué estado. F8 le agrega lo que hace falta para cerrar
-- el circuito reserva/aprobación:
--
--   * `cantidad`          : cuántas unidades se reservan o se piden comprar.
--                           Antes una reserva no podía decir "3 cables".
--   * `respuesta`         : nota del docente al aprobar o rechazar (por qué no,
--                           para cuándo, etc.). El alumno la ve en "Mis solicitudes".
--   * `resuelta_por`      : qué superusuario resolvió la solicitud. El movimiento
--                           del retiro registra al alumno (quien lo retira), así
--                           que sin esta columna no queda rastro de quién aprobó.
--   * `fecha_resolucion`  : cuándo se aprobó o rechazó.
--   * `id_movimiento`     : el retiro que materializó una reserva aprobada. Es un
--                           UNIQUE: un retiro no puede nacer de dos solicitudes.
--                           `ON DELETE SET NULL` porque el retiro puede irse en
--                           cascada con el ítem; la solicitud queda como registro.
--
-- Es idempotente: se puede correr más de una vez.

USE tic_stock;

-- ------------------------------------------------------------------ columnas
SET @ya_tiene_cantidad = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'cantidad'
);
SET @sql = IF(@ya_tiene_cantidad = 0,
  'ALTER TABLE solicitudes ADD COLUMN cantidad INT UNSIGNED NOT NULL DEFAULT 1 AFTER estado',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_respuesta = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'respuesta'
);
SET @sql = IF(@ya_tiene_respuesta = 0,
  'ALTER TABLE solicitudes ADD COLUMN respuesta VARCHAR(500) NULL AFTER descripcion',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_id_movimiento = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'id_movimiento'
);
SET @sql = IF(@ya_tiene_id_movimiento = 0,
  'ALTER TABLE solicitudes ADD COLUMN id_movimiento INT UNSIGNED NULL AFTER respuesta',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_resuelta_por = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'resuelta_por'
);
SET @sql = IF(@ya_tiene_resuelta_por = 0,
  'ALTER TABLE solicitudes ADD COLUMN resuelta_por INT UNSIGNED NULL AFTER id_movimiento',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_fecha_resolucion = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'fecha_resolucion'
);
SET @sql = IF(@ya_tiene_fecha_resolucion = 0,
  'ALTER TABLE solicitudes ADD COLUMN fecha_resolucion TIMESTAMP NULL AFTER fecha',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ indice unico
-- MySQL permite N NULL en un indice UNIQUE, asi que las solicitudes sin retiro
-- (compras, reservas pendientes) no se pisan entre si; lo unico que se bloquea es
-- que dos solicitudes apunten al mismo retiro.
SET @ya_tiene_uq_movimiento = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND INDEX_NAME = 'uq_solicitudes_movimiento'
);
SET @sql = IF(@ya_tiene_uq_movimiento = 0,
  'ALTER TABLE solicitudes ADD UNIQUE KEY uq_solicitudes_movimiento (id_movimiento)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ claves foraneas
SET @tiene_fk_movimiento = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
    AND CONSTRAINT_NAME = 'fk_solicitudes_movimiento'
);
SET @sql = IF(@tiene_fk_movimiento = 0,
  'ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimientos (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tiene_fk_resuelta_por = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
    AND CONSTRAINT_NAME = 'fk_solicitudes_resuelta_por'
);
SET @sql = IF(@tiene_fk_resuelta_por = 0,
  'ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_resuelta_por FOREIGN KEY (resuelta_por) REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ CHECK
-- Una reserva siempre apunta a un item existente; una compra puede ser de un
-- insumo que todavia no esta cargado (id_item NULL). Se agrega solo si las filas
-- existentes ya cumplen, para no romper una base con datos viejos.
SET @reservas_sin_item = (
  SELECT COUNT(*) FROM solicitudes WHERE tipo = 'reserva' AND id_item IS NULL
);
SET @tiene_check = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
    AND CONSTRAINT_NAME = 'chk_solicitudes_reserva_item'
);
SET @sql = IF(@tiene_check = 0 AND @reservas_sin_item = 0,
  'ALTER TABLE solicitudes ADD CONSTRAINT chk_solicitudes_reserva_item CHECK (tipo = ''compra'' OR (tipo = ''reserva'' AND id_item IS NOT NULL))',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT IF(@reservas_sin_item > 0,
  'ATENCION: hay reservas sin id_item, el CHECK no se agrego. Resolvelas a mano y volve a correr la migracion.',
  'Migracion 05 aplicada correctamente.') AS resultado;

-- ------------------------------------------------------------------ resumen
SELECT COLUMN_NAME AS columna, COLUMN_TYPE AS tipo, IS_NULLABLE AS nullable
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
  ORDER BY ORDINAL_POSITION;

SELECT CONSTRAINT_NAME AS clave, CONSTRAINT_TYPE AS tipo
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
  ORDER BY CONSTRAINT_NAME;
