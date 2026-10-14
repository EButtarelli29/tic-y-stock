const pool = require('./db');
const Movimiento = require('./movimiento.model');

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

/**
 * Borra un usuario.
 *
 * Se niega si tiene préstamos abiertos. Sus movimientos se irían en cascada y con
 * ellos el único registro de que ese material está afuera del pañol: el ítem
 * volvería "disponible" con una unidad menos de las que realmente tiene, y nadie
 * podría devolver lo que ya no está anotado en ningún lado. Es el mismo criterio
 * que el `RESTRICT` de `solicitudes`: un registro administrativo se resuelve a
 * mano, no se borra.
 *
 * La regla vive acá y no en el controlador para que ningún llamador la esquive.
 * Devuelve `{ ok, error }` en vez de tirar, porque es el camino normal de un
 * formulario mal tocado, no una falla.
 */
async function remove(id) {
  const pendientes = await Movimiento.contarPrestamosAbiertosDe({ id_usuario: id });
  if (pendientes > 0) {
    return {
      ok: false,
      error: `Este usuario tiene ${pendientes} préstamo(s) sin devolver. Registrá la devolución antes de eliminar la cuenta.`,
    };
  }
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  return { ok: result.affectedRows > 0 };
}

async function countByRol(rol) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol = ?', [rol]);
  return rows[0].total;
}

module.exports = { findByEmail, findById, findAll, create, update, remove, countByRol };