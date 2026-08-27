-- =====================================================================
--  Agenda de Contactos — esquema de base de datos (MySQL / MariaDB)
--  Uso:  mysql -u root -p < backend/database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS agenda_contactos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE agenda_contactos;

DROP TABLE IF EXISTS contactos;

CREATE TABLE contactos (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL,
    correo   VARCHAR(180) NOT NULL,
    telefono VARCHAR(40)  NOT NULL
) ENGINE = InnoDB;

-- Datos de ejemplo (opcional)
INSERT INTO contactos (nombre, correo, telefono) VALUES
    ('Ana Pérez',  'ana.perez@example.com',  '+34 600 123 456'),
    ('Luis Gómez', 'luis.gomez@example.com', '611 222 333'),
    ('Marta Ruiz', 'marta.ruiz@example.com', '622-333-444');
