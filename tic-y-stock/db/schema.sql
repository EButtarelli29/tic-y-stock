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
CREATE TABLE IF NOT EXISTS movimientos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_item INT UNSIGNED NOT NULL,
  id_usuario INT UNSIGNED NOT NULL,
  tipo ENUM('retiro', 'devolucion') NOT NULL,
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  codigo_escaneado VARCHAR(255) NULL,
  INDEX idx_movimientos_item (id_item),
  INDEX idx_movimientos_usuario (id_usuario),
  INDEX idx_movimientos_fecha (fecha_hora)
) ENGINE=InnoDB;

-- T-05: tabla alertas (devoluciones pendientes/vencidas)
CREATE TABLE IF NOT EXISTS alertas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_movimiento INT UNSIGNED NOT NULL,
  estado ENUM('activa', 'resuelta') NOT NULL DEFAULT 'activa',
  fecha_vencimiento DATE NULL,
  INDEX idx_alertas_estado (estado)
) ENGINE=InnoDB;

-- T-06: tabla solicitudes (reservas y pedidos de compra)
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  id_item INT UNSIGNED NULL,
  tipo ENUM('reserva', 'compra') NOT NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
  descripcion VARCHAR(500) NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Soporte para la sección de contacto del Sprint 4 (T-52)
CREATE TABLE IF NOT EXISTS contactos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mensaje VARCHAR(1000) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;