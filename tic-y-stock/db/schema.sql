-- TIC & Stock - Esquema de base de datos (MySQL/MariaDB)
-- Etapa 1 (Sprint 2): tabla usuarios para autenticación (T-02 del Product Backlog)
-- Identificadores en ASCII para evitar problemas de codificación entre clientes.

CREATE DATABASE IF NOT EXISTS tic_stock
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tic_stock;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  contrasena_hasheada VARCHAR(255) NOT NULL,
  rol ENUM('usuario', 'superusuario') NOT NULL DEFAULT 'usuario',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- T-03: tabla items (inventario del pañol del taller TIC)
CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(190) NOT NULL,
  categoria VARCHAR(60) NOT NULL DEFAULT 'general',
  cantidad INT UNSIGNED NOT NULL DEFAULT 0,
  cantidad_minima INT UNSIGNED NOT NULL DEFAULT 5,
  estado ENUM('disponible', 'prestado', 'en_reparacion', 'baja') NOT NULL DEFAULT 'disponible',
  observaciones VARCHAR(500) NULL,
  foto VARCHAR(255) NULL,
  ubicacion VARCHAR(120) NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_items_categoria (categoria),
  INDEX idx_items_estado (estado)
) ENGINE=InnoDB;

-- T-04: tabla movimientos (trazabilidad de retiros y devoluciones)
-- Los movimientos cuelgan del ítem y del usuario: si se borra cualquiera de los
-- dos, sus movimientos se borran también (CASCADE). Un movimiento sin usuario ni
-- ítem no tiene sentido como registro de trazabilidad.
--
-- F5 (T-28 a T-32): una devolución cierra el retiro al que apunta
-- `id_retiro`. Cada fila es un evento ("en este momento, esta persona se llevó
-- estas unidades"), así el historial es auditable en vez de pisarse. De ahí el
-- UNIQUE: un retiro se devuelve como máximo una vez (las devoluciones parciales
-- quedan fuera del alcance de la aplicación). MySQL admite varios NULL en un
-- índice UNIQUE, así que los retiros (con id_retiro NULL) no se pisan entre sí.
CREATE TABLE IF NOT EXISTS movimientos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_item INT UNSIGNED NOT NULL,
  id_usuario INT UNSIGNED NOT NULL,
  tipo ENUM('retiro', 'devolucion') NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  id_retiro INT UNSIGNED NULL,
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  codigo_escaneado VARCHAR(255) NULL,
  observaciones VARCHAR(500) NULL,
  INDEX idx_movimientos_item (id_item),
  INDEX idx_movimientos_usuario (id_usuario),
  INDEX idx_movimientos_fecha (fecha_hora),
  UNIQUE KEY uq_movimientos_id_retiro (id_retiro),
  CONSTRAINT fk_movimientos_item FOREIGN KEY (id_item) REFERENCES items (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_movimientos_retiro FOREIGN KEY (id_retiro) REFERENCES movimientos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_movimientos_vinculo CHECK (
    (tipo = 'devolucion' AND id_retiro IS NOT NULL) OR (tipo = 'retiro' AND id_retiro IS NULL)
  )
) ENGINE=InnoDB;

-- T-05: tabla alertas (devoluciones pendientes/vencidas)
-- Una alerta pertenece a un movimiento: si el movimiento se borra, la alerta
-- también.
CREATE TABLE IF NOT EXISTS alertas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_movimiento INT UNSIGNED NOT NULL,
  estado ENUM('activa', 'resuelta') NOT NULL DEFAULT 'activa',
  fecha_vencimiento DATE NULL,
  INDEX idx_alertas_estado (estado),
  CONSTRAINT fk_alertas_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimientos (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- T-06: tabla solicitudes (reservas y pedidos de compra)
-- Una solicitud es un registro administrativo: si el usuario o el ítem existen,
-- la solicitud NO se borra sola (RESTRICT). Hay que resolverla a mano para no
-- perder el historial de lo pedido.
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  id_item INT UNSIGNED NULL,
  tipo ENUM('reserva', 'compra') NOT NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
  descripcion VARCHAR(500) NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_solicitudes_usuario (id_usuario),
  INDEX idx_solicitudes_estado (estado),
  CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_solicitudes_item FOREIGN KEY (id_item) REFERENCES items (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Soporte para el formulario de contacto (T-23)
CREATE TABLE IF NOT EXISTS contactos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mensaje VARCHAR(1000) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;