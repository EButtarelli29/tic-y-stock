-- Migración 01: agregar claves foráneas e índices de soporte.
--
-- Para bases nuevas no hace falta: `db/schema.sql` ya las trae.
-- Para bases ya instaladas (las del equipo, la del taller), correr:
--
--     cmd /c "mysql -u root < db\migracion-01-fks.sql"
--
-- Antes de correrla, verificar que no queden filas huérfanas: el script las
-- detecta y avisa en lugar de borrar nada.

USE tic_stock;

SET @tiene_fk_mov_item = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
    AND CONSTRAINT_NAME = 'fk_movimientos_item'
);
SET @tiene_fk_mov_user = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'movimientos'
    AND CONSTRAINT_NAME = 'fk_movimientos_usuario'
);
SET @tiene_fk_ala_mov = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'alertas'
    AND CONSTRAINT_NAME = 'fk_alertas_movimiento'
);
SET @tiene_fk_sol_user = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
    AND CONSTRAINT_NAME = 'fk_solicitudes_usuario'
);
SET @tiene_fk_sol_item = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes'
    AND CONSTRAINT_NAME = 'fk_solicitudes_item'
);

-- ---------------------------------------------------------------- huérfanos
-- Si alguna de estas consultas devuelve filas, hay datos que apuntan a
-- registros inexistentes: revisarlos a mano antes de agregar las claves.
SELECT 'movimientos sin item' AS problema, COUNT(*) AS filas
  FROM movimientos m LEFT JOIN items i ON i.id = m.id_item WHERE i.id IS NULL
UNION ALL
SELECT 'movimientos sin usuario', COUNT(*)
  FROM movimientos m LEFT JOIN usuarios u ON u.id = m.id_usuario WHERE u.id IS NULL
UNION ALL
SELECT 'alertas sin movimiento', COUNT(*)
  FROM alertas a LEFT JOIN movimientos m ON m.id = a.id_movimiento WHERE m.id IS NULL
UNION ALL
SELECT 'solicitudes sin usuario', COUNT(*)
  FROM solicitudes s LEFT JOIN usuarios u ON u.id = s.id_usuario WHERE u.id IS NULL
UNION ALL
SELECT 'solicitudes sin item', COUNT(*)
  FROM solicitudes s LEFT JOIN items i ON i.id = s.id_item WHERE s.id_item IS NOT NULL AND i.id IS NULL;

-- ---------------------------------------------------------------- índices
-- `solicitudes` se filtra por estado en el panel del superusuario (T-45).
SET @ya_tiene_indice_estado = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'estado'
);
SET @sql_indice = IF(@ya_tiene_indice_estado = 0,
  'ALTER TABLE solicitudes ADD INDEX idx_solicitudes_estado (estado)',
  'DO 0');
PREPARE stmt FROM @sql_indice; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ya_tiene_indice_usuario = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'tic_stock' AND TABLE_NAME = 'solicitudes' AND COLUMN_NAME = 'id_usuario'
);
SET @sql_indice2 = IF(@ya_tiene_indice_usuario = 0,
  'ALTER TABLE solicitudes ADD INDEX idx_solicitudes_usuario (id_usuario)',
  'DO 0');
PREPARE stmt FROM @sql_indice2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------- claves
-- CASCADE: el registro de trazabilidad desaparece con su dueño.
SET @sql = IF(@tiene_fk_mov_item = 0,
  'ALTER TABLE movimientos ADD CONSTRAINT fk_movimientos_item FOREIGN KEY (id_item) REFERENCES items (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@tiene_fk_mov_user = 0,
  'ALTER TABLE movimientos ADD CONSTRAINT fk_movimientos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@tiene_fk_ala_mov = 0,
  'ALTER TABLE alertas ADD CONSTRAINT fk_alertas_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimientos (id) ON DELETE CASCADE ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RESTRICT: una solicitud es un registro administrativo, no se borra en cascada.
SET @sql = IF(@tiene_fk_sol_user = 0,
  'ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@tiene_fk_sol_item = 0,
  'ALTER TABLE solicitudes ADD CONSTRAINT fk_solicitudes_item FOREIGN KEY (id_item) REFERENCES items (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------- resumen
SELECT TABLE_NAME AS tabla, CONSTRAINT_NAME AS clave, REFERENCED_TABLE_NAME AS referencia
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE CONSTRAINT_SCHEMA = 'tic_stock' AND REFERENCED_TABLE_NAME IS NOT NULL
  ORDER BY TABLE_NAME, CONSTRAINT_NAME;