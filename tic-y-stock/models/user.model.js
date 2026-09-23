const pool = require('./db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, fecha_creacion FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findAll({ q = '', rol = '' } = {}) {
  const where = [];
  const params = [];
  if (q) {
    where.push('(nombre LIKE ? OR email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (rol) {
    where.push('rol = ?');
    params.push(rol);
  }
  let sql = 'SELECT id, nombre, email, rol, fecha_creacion FROM usuarios';
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY fecha_creacion DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function create({ nombre, email, contraseñaHasheada, rol = 'usuario' }) {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nombre, email, contrasena_hasheada, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, contraseñaHasheada, rol]
  );
  return result.insertId;
}

async function update(id, { nombre, email, rol, contraseña } = {}) {
  const sets = [];
  const params = [];
  if (nombre !== undefined) {
    sets.push('nombre = ?');
    params.push(nombre);
  }
  if (email !== undefined) {
    sets.push('email = ?');
    params.push(email);
  }
  if (rol !== undefined) {
    sets.push('rol = ?');
    params.push(rol);
  }
  if (contraseña !== undefined) {
    sets.push('contrasena_hasheada = ?');
    params.push(contraseña);
  }
  if (!sets.length) return false;
  params.push(id);
  const [result] = await pool.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function countByRol(rol) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol = ?', [rol]);
  return rows[0].total;
}

module.exports = { findByEmail, findById, findAll, create, update, remove, countByRol };