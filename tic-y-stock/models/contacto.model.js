const pool = require('./db');

async function create({ nombre, email, mensaje }) {
  const [result] = await pool.query('INSERT INTO contactos (nombre, email, mensaje) VALUES (?, ?, ?)', [
    nombre,
    email,
    mensaje,
  ]);
  return result.insertId;
}

module.exports = { create };