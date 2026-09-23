const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'items');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXT_PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (MIME_PERMITIDOS.includes(file.mimetype) || EXT_PERMITIDAS.includes(ext)) {
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
      texto: 'La foto debe ser una imagen (JPG, PNG, WEBP o GIF) de hasta 5 MB.',
      tipo: 'error',
    };
    return res.redirect(req.originalUrl);
  });
}

module.exports = { subirFoto };