-- =====================================================================
--  Agenda de Contactos — esquema de base de datos (PostgreSQL)
--  Uso:  createdb agenda_contactos
--        psql -d agenda_contactos -f backend/database/schema.postgres.sql
-- =====================================================================

DROP TABLE IF EXISTS contactos;

CREATE TABLE contactos (
    id       SERIAL PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL,
    correo   VARCHAR(180) NOT NULL,
    telefono VARCHAR(40)  NOT NULL
);

INSERT INTO contactos (nombre, correo, telefono) VALUES
    ('Ana Pérez',  'ana.perez@example.com',  '+34 600 123 456'),
    ('Luis Gómez', 'luis.gomez@example.com', '611 222 333'),
    ('Marta Ruiz', 'marta.ruiz@example.com', '622-333-444');
