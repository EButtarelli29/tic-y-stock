// Crea la cuenta de superusuario inicial (docente / Jefe de Taller).
// Uso: npm run db:seed
require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../models/db');
const User = require('../models/user.model');

async function main() {
  const nombre = process.env.SEED_NOMBRE || 'Docente TIC';
  const email = (process.env.SEED_EMAIL || 'docente@ticystock.ar').toLowerCase();
  // Nombre de variable en ASCII a propósito: las variables de entorno con
  // "ñ" fallan según la codificación de la consola, y `.env.example` documenta
  // esta misma clave.
  const contraseña = process.env.SEED_CONTRASENA || 'docente123';

  const existe = await User.findByEmail(email);
  if (existe) {
    console.log(`Ya existe una cuenta con ${email}.`);
    await pool.end();
    return;
  }

  const contraseñaHasheada = await bcrypt.hash(contraseña, 10);
  await pool.query(
    'INSERT INTO usuarios (nombre, email, contrasena_hasheada, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, contraseñaHasheada, 'superusuario']
  );

  console.log(`Superusuario creado: ${email} (contraseña: ${contraseña}).`);
  console.log('Cambiá estas credenciales antes de una implementación real.');
  await pool.end();
}

main().catch((err) => {
  console.error('Error creando el superusuario:', err.message);
  process.exit(1);
});