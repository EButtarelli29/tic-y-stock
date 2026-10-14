-- Migración 03: código de barras por ítem (F6 — T-33 a T-38).
--
-- Para bases nuevas no hace falta: `db/schema.sql` ya trae la columna.
-- Para bases ya instaladas (las del equipo, la del taller), correr:
--
--     & 'C:\xampp\mysql\bin\mysql.exe' -u root --default-character-set=utf8mb4 -e "source db/migracion-03-codigos.sql"
--
-- Qué agrega:
--   * `items.codigo_barras` : el código impreso en la etiqueta física. Es lo que
--                             el escaneo resuelve contra el ítem (T-38) y lo que
--                             queda asentado en `movimientos.codigo_escaneado`.
--
-- Decisión importante: el código NO se edita a mano. Se deriva del `id`
-- (`TIC-` + 6 dígitos), así que una etiqueta impresa hace un año sigue
-- apuntando al mismo ítem. Si el docente pudiera cambiarlo, cada etiqueta ya
-- pegada en el taller quedaría apuntando a otra cosa y el escaneo llevaría al
-- material al ítem equivocado. El formulario lo muestra sólo lectura.
--
-- Formato Code128: `TIC-000073` son mayúsculas, dígitos y guion, los tres
-- admitidos por Code128, que es el código de barras más compatible con los
-- lectores USB baratos del taller (EAN-13 no admite letras).
--
-- Es idempotente: se puede correr más de una vez.

USE tic_stock;

-- ------------------------------------------------------------------ columna
SET @ya_tiene_codigo = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'codigo_barras'
);

SET @sql = IF(@ya_tiene_codigo > 0, 'SELECT 1', 'ALTER TABLE items ADD COLUMN codigo_barras VARCHAR(64) NULL AFTER ubicacion');
PREPARE st FROM @sql;
EXECUTE st;
DEALLOCATE PREPARE st;

-- ------------------------------------------------------------------ índice
-- UNIQUE, y no INDEX: si dos ítems compartieran código, el escaneo resolvería
-- uno de los dos al azar y el material se anotaría en el ítem que no es.
SET @ya_tiene_indice = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND INDEX_NAME = 'uq_items_codigo_barras'
);

SET @sql = IF(@ya_tiene_indice > 0, 'SELECT 1',
  'ALTER TABLE items ADD UNIQUE KEY uq_items_codigo_barras (codigo_barras)');
PREPARE st FROM @sql;
EXECUTE st;
DEALLOCATE PREPARE st;

-- ------------------------------------------------------------------ backfill
-- Deriva el código del id, que es único y no cambia. Los NULL no chocan con el
-- UNIQUE de MySQL (varios NULLs son "todos distintos"), por eso esta etapa puede
-- correr antes de que la columna esté completa sin problema.
UPDATE items
SET codigo_barras = CONCAT('TIC-', LPAD(id, 6, '0'))
WHERE codigo_barras IS NULL OR codigo_barras = '';

SELECT ROW_COUNT() AS codigos_generados;

SELECT COUNT(*) AS items_sin_codigo FROM items WHERE codigo_barras IS NULL OR codigo_barras = '';

SELECT IF((SELECT COUNT(*) FROM items WHERE codigo_barras IS NULL OR codigo_barras = '') = 0,
  'Migracion 03 aplicada correctamente.',
  'ATENCION: quedan items sin codigo de barras.') AS resultado;