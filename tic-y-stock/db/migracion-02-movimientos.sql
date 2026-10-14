-- Migración 02: cantidad por movimiento y vínculo devolución → retiro (F5).
--
-- Para bases nuevas no hace falta: `db/schema.sql` ya trae las columnas.
-- Para bases ya instaladas (las del equipo, la del taller), correr:
--
--     & 'C:\xampp\mysql\bin\mysql.exe' -u root --default-character-set=utf8mb4 -e "source db/migracion-02-movimientos.sql"
--
-- Qué agrega:
--   * `cantidad`      : cuántas unidades se movieron. Antes el ENUM retiro/devolucion
--                       era binario y no se podía anotar "retiró 3 de 12".
--   * `id_retiro`     : en una devolución, el retiro que cierra. Es lo que permite
--                       responder "¿quién tiene esto?" (T-32) y resolver alertas (T-41).
--   * `observaciones` : nota del retiro/devolución (para qué lo necesita, cómo volvió).
--   * UNIQUE(id_retiro): garantiza a nivel de base que un retiro se devuelve una sola vez.
--
-- También normaliza `items.estado`: con el estado calculado a partir de los
-- movimientos, los ítems que estaban marcados 'prestado' sin ningún préstamo
-- registrado pasan a 'disponible'.
--
-- Es idempotente: se puede correr más de una vez.

USE tic_stock;

-- ------------------------------------------------------------------ columnas
SET @ya_tiene_cantidad = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos' AND COLUMN_NAME = 'cantidad'
);
SET @sql = IF(@ya_tiene_cantidad = 0,
  'ALTER TABLE movimientos ADD COLUMN cantidad INT UNSIGNED NOT NULL DEFAULT 1 AFTER tipo',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_id_retiro = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos' AND COLUMN_NAME = 'id_retiro'
);
SET @sql = IF(@ya_tiene_id_retiro = 0,
  'ALTER TABLE movimientos ADD COLUMN id_retiro INT UNSIGNED NULL AFTER cantidad',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_observaciones = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos' AND COLUMN_NAME = 'observaciones'
);
SET @sql = IF(@ya_tiene_observaciones = 0,
  'ALTER TABLE movimientos ADD COLUMN observaciones VARCHAR(500) NULL AFTER codigo_escaneado',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ inspección
-- Corre DESPUÉS de agregar las columnas, porque consulta `id_retiro`.
-- Si estas consultas devuelven filas, hay devoluciones de bases viejas que no se
-- pueden enlazar con su retiro (no guardaban a cuál correspondían): en ese caso el
-- CHECK de abajo NO se agrega y hay que resolverlas a mano.
SELECT 'devoluciones sin id_retiro' AS problema, COUNT(*) AS filas
  FROM movimientos WHERE tipo = 'devolucion' AND id_retiro IS NULL
UNION ALL
SELECT 'devoluciones apuntando a un retiro inexistente', COUNT(*)
  FROM movimientos d
  LEFT JOIN movimientos r ON r.id = d.id_retiro
  WHERE d.tipo = 'devolucion' AND d.id_retiro IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'retiros con id_retiro (deberia ser 0)', COUNT(*)
  FROM movimientos WHERE tipo = 'retiro' AND id_retiro IS NOT NULL;

-- ------------------------------------------------------------------ indice unico
-- MySQL permite N NULL en un indice UNIQUE, asi que los retiros (que tienen
-- id_retiro NULL) no se pisan entre si; lo unico que se bloquea es una segunda
-- devolucion del mismo retiro.
SET @ya_tiene_uq_retiro = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos' AND INDEX_NAME = 'uq_movimientos_id_retiro'
);
SET @sql = IF(@ya_tiene_uq_retiro = 0,
  'ALTER TABLE movimientos ADD UNIQUE KEY uq_movimientos_id_retiro (id_retiro)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ clave foranea
SET @tiene_fk_retiro = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
    AND CONSTRAINT_NAME = 'fk_movimientos_retiro'
);
SET @sql = IF(@tiene_fk_retiro = 0,
  'ALTER TABLE movimientos ADD CONSTRAINT fk_movimientos_retiro FOREIGN KEY (id_retiro) REFERENCES movimientos (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ CHECK
-- Invariante del modelo: una devolucion siempre cierra un retiro, y un retiro
-- nunca cierra otro movimiento.
SET @devoluciones_huerfanas = (
  SELECT COUNT(*) FROM movimientos WHERE tipo = 'devolucion' AND id_retiro IS NULL
);
SET @tiene_check = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
    AND CONSTRAINT_NAME = 'chk_movimientos_vinculo'
);
SET @sql = IF(@tiene_check = 0 AND @devoluciones_huerfanas = 0,
  'ALTER TABLE movimientos ADD CONSTRAINT chk_movimientos_vinculo CHECK ((tipo = ''devolucion'' AND id_retiro IS NOT NULL) OR (tipo = ''retiro'' AND id_retiro IS NULL))',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------- normalizar items.estado
-- `items.estado` paso a calcularse a partir de los movimientos (T-29/T-30), pero
-- el ENUM no cambio: las bases viejas pueden tener items marcados 'prestado' que
-- no tienen ningun prestamo registrado, que es exactamente la mentira que el
-- recálculo viene a eliminar.
--
-- Solo se toca el eje disponible/prestado. 'baja' y 'en_reparacion' son
-- decisiones del docente y no se tocan nunca.
UPDATE items i
SET i.estado = 'disponible'
WHERE i.estado = 'prestado'
  AND NOT EXISTS (
    SELECT 1 FROM movimientos m
    WHERE m.id_item = i.id AND m.tipo = 'retiro'
      AND NOT EXISTS (SELECT 1 FROM movimientos d WHERE d.id_retiro = m.id)
  );

SELECT ROW_COUNT() AS items_normalizados;

SELECT IF(@devoluciones_huerfanas > 0,
  'ATENCION: hay devoluciones sin id_retiro, el CHECK no se agrego. Enlazalas a mano y volve a correr la migracion.',
  'Migracion 02 aplicada correctamente.') AS resultado;

-- ------------------------------------------------------------------ resumen
SELECT COLUMN_NAME AS columna, COLUMN_TYPE AS tipo, IS_NULLABLE AS nullable
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
  ORDER BY ORDINAL_POSITION;

SELECT CONSTRAINT_NAME AS clave, CONSTRAINT_TYPE AS tipo
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
  ORDER BY CONSTRAINT_NAME;