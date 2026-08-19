const pool = require('./db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function create({ nombre, email, contraseñaHasheada }) {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, contrasena_hasheada, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, contraseñaHasheada, 'usuario']
  );
  return result.insertId;
}

module.exports = { findByEmail, create };