const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'items');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Extensiones que el formulario HTML ofrece al usuario.
const EXT_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// MIME permitido -> extensión con la que SE GUARDA el archivo.
// Guardar siempre con la extensión del MIME (y no con la del nombre original)
// evita que un `.html` o un `.svg` subido como imagen termine servido como
// HTML por `express.static`, que sería un XSS almacenado en el mismo origen.
const MIME_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = MIME_PERMITIDOS[file.mimetype.toLowerCase()] || '.bin';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    const ext = path.extname(String(file.originalname || '')).toLowerCase();

    // Ambas condiciones a la vez: el MIME tiene que ser una imagen conocida Y la
    // extensión del archivo tiene que estar en la lista blanca.
    if (MIME_PERMITIDOS[mime] && EXT_PERMITIDAS.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error('Formato de imagen no permitido'));
  },
});

function subirFoto(req, res, next) {
  upload.single('foto')(req, res, (err) => {
    if (!err) {
      return next();
    }
    req.session.mensaje = {
      texto: err.code === 'LIMIT_FILE_SIZE'
        ? 'La foto supera el tamaño máximo permitido (5 MB).'
        : 'La foto debe ser una imagen (JPG, PNG, WEBP o GIF) de hasta 5 MB.',
      tipo: 'error',
    };
    return res.redirect(req.originalUrl);
  });
}

module.exports = { subirFoto, MIME_PERMITIDOS, EXT_PERMITIDAS, MAX_BYTES };