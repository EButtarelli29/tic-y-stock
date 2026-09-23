const pool = require('./db');

async function countActivas() {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM alertas WHERE estado = 'activa'");
  return rows[0].total;
}

module.exports = { countActivas };