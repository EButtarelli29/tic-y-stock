const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tic_stock',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

/**
 * Ejecuta `fn` dentro de una transacción y devuelve su resultado.
 *
 * Existe porque hay operaciones que tocan más de una tabla y no pueden quedar a
 * medias: registrar un retiro escribe en `movimientos` *y* descuenta en `items`.
 * Si la segunda fallara, el inventario mostraría stock que en realidad ya se fue.
 *
 * `fn` recibe una conexión dedicada (no el pool), así que todo lo que hace
 * adentro va por ella o no forma parte de la transacción:
 *
 *     await db.withTransaction(async (conn) => {
 *       await conn.query('UPDATE items SET cantidad = cantidad - 1 WHERE id = ?', [id]);
 *       return algo;
 *     });
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    // Un ROLLBACK sobre una conexión ya caída también tira; el error original
    // es el que importa, así que el del rollback se descarta.
    try {
      await conn.rollback();
    } catch (_errRollback) {
      /* la conexión ya no sirve, no hay nada que revertir */
    }
    throw err;
  } finally {
    conn.release();
  }
}

// Se expone como propiedad del pool para no obligar a cambiar los `require`
// de los modelos que solo necesitan `pool.query(...)`.
pool.withTransaction = withTransaction;

module.exports = pool;