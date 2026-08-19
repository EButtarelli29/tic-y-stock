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

-- Las tablas items, movimientos, alertas y solicitudes se crean en Sprints posteriores (F3 a F8).