const pool = require('./db');

async function ultimos(limite = 8) {
  const [rows] = await pool.query(
    `SELECT m.id, m.tipo, m.fecha_hora, i.nombre AS item_nombre, u.nombre AS usuario_nombre
     FROM movimientos m
     JOIN items i ON i.id = m.id_item
     JOIN usuarios u ON u.id = m.id_usuario
     ORDER BY m.fecha_hora DESC
     LIMIT ?`,
    [limite]
  );
  return rows;
}

module.exports = { ultimos };