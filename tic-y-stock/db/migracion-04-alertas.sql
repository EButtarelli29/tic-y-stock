-- TIC & Stock - Migracion 04: alertas de devolucion (F7, T-39 a T-41)
--
-- La tabla `alertas` ya existe desde F1 (T-05). Esta migracion es *de datos*: le
-- crea la alerta a los prestamos que ya estaban abiertos cuando se empezo a usar
-- F7, para que el panel no arranque mintiendo (con material afuera y cero avisos).
--
-- Es idempotente: solo inserta donde todavia no hay una alerta para ese
-- movimiento. Correrla dos veces no duplica nada.
--
-- El plazo de 7 dias es el mismo default que `PLAZO_PRESTAMO_DIAS` (ver
-- `.env.example`). Si en el taller se usa otro plazo, cambia el INTERVAL de abajo
-- antes de correr la migracion.

USE tic_stock;

INSERT INTO alertas (id_movimiento, estado, fecha_vencimiento)
SELECT m.id, 'activa', DATE_ADD(DATE(m.fecha_hora), INTERVAL 7 DAY)
FROM movimientos m
WHERE m.tipo = 'retiro'
  -- solo retiros que siguen abiertos (sin devolucion que los cierre)
  AND NOT EXISTS (SELECT 1 FROM movimientos d WHERE d.id_retiro = m.id)
  -- y que todavia no tengan su alerta
  AND NOT EXISTS (SELECT 1 FROM alertas a WHERE a.id_movimiento = m.id);
