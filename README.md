# Agenda de Contactos

Prueba técnica. Monorepo con dos carpetas:

- `backend/` - API REST en PHP (MySQL)
- `frontend/` - React + Vite + TypeScript

## Requisitos

- PHP 8.1 o superior con la extensión `pdo_mysql`
- MySQL 5.7 o superior
- Node.js 18 o superior y npm

## Base de datos

Crear la base de datos y la tabla ejecutando el script incluido:

```
mysql -u root -p < backend/database/schema.sql
```

Esto crea la base `agenda_contactos`, la tabla `contactos` y algunos registros de ejemplo.

Estructura de la tabla:

```sql
CREATE TABLE contactos (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL,
    correo   VARCHAR(180) NOT NULL,
    telefono VARCHAR(40)  NOT NULL
);
```

Configurar la conexión copiando `backend/.env.example` a `backend/.env` y ajustando
usuario y contraseña:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=agenda_contactos
DB_USER=root
DB_PASS=tu_password
```

## Backend

```
cd backend
php -S localhost:8000 index.php
```

La API queda en `http://localhost:8000`.

Endpoints:

- `GET /contactos` - lista de contactos (`?nombre=` filtra por nombre)
- `POST /contactos` - crea un contacto
- `DELETE /contactos/{id}` - elimina un contacto

## Frontend

```
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`.

La URL del backend se define en `frontend/.env` (`VITE_API_URL`, por defecto
`http://localhost:8000`).

## Notas

Levantar primero el backend y luego el frontend. Los dos tienen que estar
corriendo a la vez.
