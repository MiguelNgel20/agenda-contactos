# Documentación del proyecto

Explicación de cómo está montado el proyecto y qué hace cada archivo.

---

## 1. Idea general

Es una aplicación de una sola página para gestionar una agenda de contactos:

- Ver la lista de contactos en una tabla.
- Filtrar la lista por nombre.
- Crear un contacto nuevo con un formulario validado.
- Eliminar un contacto.

Está dividida en dos partes independientes dentro del mismo repositorio
(monorepo):

- **Backend**: una API REST en PHP que habla con MySQL.
- **Frontend**: una web en React que consume esa API.

El frontend nunca toca la base de datos directamente: todo pasa por la API.

---

## 2. Estructura de carpetas

```
proyectoPrueba/
├── backend/
│   ├── Config/
│   │   └── Database.php          Conexión a la base de datos (PDO)
│   ├── Controllers/
│   │   └── ContactoController.php Lógica de cada endpoint
│   ├── Models/
│   │   └── ContactoModel.php     Consultas SQL a la tabla contactos
│   ├── database/
│   │   └── schema.sql            Script para crear la BD y la tabla
│   ├── storage/                  (solo se usa en modo sqlite de pruebas)
│   ├── .env.example             Plantilla de configuración
│   └── index.php                Punto de entrada / router de la API
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── contactos.ts      Llamadas HTTP a la API (axios)
│   │   ├── components/
│   │   │   ├── ContactoForm.tsx  Formulario de alta
│   │   │   └── ContactosTable.tsx Tabla + botón eliminar
│   │   ├── App.tsx               Componente principal (une todo)
│   │   ├── main.tsx              Arranque de React
│   │   ├── types.ts             Tipos TypeScript compartidos
│   │   ├── validation.ts        Validación del formulario
│   │   └── index.css            Estilos
│   ├── .env                      URL del backend
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── README.md                    Instrucciones cortas para levantar el proyecto
└── DOCUMENTACION.md             Este archivo
```

---

## 3. Backend (PHP)

El backend sigue un patrón **MVC** simplificado:

- **Model** (`ContactoModel`): solo sabe de SQL. Recibe datos, ejecuta consultas
  y devuelve arrays.
- **Controller** (`ContactoController`): recibe la petición, valida, llama al
  modelo y decide qué responder (código HTTP + JSON).
- **index.php**: hace de router. Mira el método HTTP y la ruta y llama al método
  correspondiente del controlador.

No usa framework ni Composer: es PHP a pelo con el servidor embebido
(`php -S`), que es suficiente para la prueba.

### 3.1. `index.php`

Es lo primero que se ejecuta en cada petición. Hace cuatro cosas:

**a) Cargar la configuración de `backend/.env`**

```php
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, ...) as $linea) {
        ...
        [$clave, $valor] = array_map('trim', explode('=', $linea, 2));
        if (getenv($clave) === false) {
            putenv("$clave=$valor");
        }
    }
}
```

Lee el archivo `.env` línea a línea (ignora comentarios y líneas vacías) y mete
cada `CLAVE=valor` en las variables de entorno con `putenv()`. Así las
credenciales de la base de datos no están escritas en el código y el `.env` no
se sube a Git.

**b) Cabeceras CORS**

```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

El frontend corre en `http://localhost:5173` y el backend en
`http://localhost:8000`. Son orígenes distintos, así que el navegador bloquea
las llamadas salvo que el servidor diga explícitamente que las permite. Eso es
lo que hacen estas cabeceras.

Además, cuando el navegador va a hacer un POST o DELETE con JSON, primero manda
una petición `OPTIONS` (preflight). Se responde con `204 No Content` y ahí
termina:

```php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
```

**c) Montar los objetos**

```php
$database = new Database();
$db = $database->connection();
$contacto = new ContactoModel($db);
$contactoController = new ContactoController($contacto);
```

Se crea la conexión y se va pasando de un objeto al siguiente
(inyección de dependencias sencilla): la conexión entra en el modelo, y el
modelo entra en el controlador.

**d) Enrutado**

```php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = '/' . trim($uri, '/');

if ($method === 'GET' && $uri === '/contactos') {
    $nombre = isset($_GET['nombre']) ? trim($_GET['nombre']) : null;
    $contactoController->obtenerContactos($nombre);
} elseif ($method === 'POST' && $uri === '/contactos') {
    $datos = json_decode(file_get_contents('php://input'), true) ?? [];
    $contactoController->crearContacto($datos);
} elseif ($method === 'DELETE' && preg_match('#^/contactos/(\d+)$#', $uri, $matches)) {
    $contactoController->borrarContacto((int) $matches[1]);
} else {
    http_response_code(404);
    echo json_encode(['message' => 'Ruta no encontrada']);
}
```

- `parse_url(..., PHP_URL_PATH)` quita la query string, para que
  `/contactos?nombre=ana` se compare como `/contactos`.
- En el POST, el cuerpo llega como JSON en el body, no como formulario, por eso
  se lee con `file_get_contents('php://input')` y se decodifica con
  `json_decode`.
- En el DELETE, la expresión regular saca el `id` de la URL
  (`/contactos/5` → `5`).
- Cualquier otra cosa devuelve `404`.

### 3.2. `Config/Database.php`

Clase que crea y guarda la conexión PDO.

En el constructor lee la configuración de las variables de entorno, con valores
por defecto pensados para MySQL en local:

```php
$this->driver = getenv('DB_DRIVER') ?: 'mysql';
$this->host   = getenv('DB_HOST')   ?: '127.0.0.1';
$this->port   = getenv('DB_PORT')   ?: '3306';
$this->name   = getenv('DB_NAME')   ?: 'agenda_contactos';
$this->user   = getenv('DB_USER')   ?: 'root';
$this->pass   = getenv('DB_PASS')   ?: '';
```

El método `connection()` crea el objeto `PDO` una sola vez (si ya existe, lo
reutiliza) con estas opciones:

- `ATTR_ERRMODE => ERRMODE_EXCEPTION`: si una consulta falla, lanza una
  excepción en vez de devolver `false` en silencio.
- `ATTR_DEFAULT_FETCH_MODE => FETCH_ASSOC`: los resultados vienen como arrays
  asociativos (`['nombre' => '...', ...]`), que es lo que se convierte bien a
  JSON.
- `ATTR_EMULATE_PREPARES => false`: usa prepared statements reales del motor,
  más seguro.

El DSN (cadena de conexión) se arma según el driver. Para MySQL:

```
mysql:host=127.0.0.1;port=3306;dbname=agenda_contactos;charset=utf8mb4
```

> Hay soporte también para `pgsql` y `sqlite`, pero el proyecto está pensado
> para MySQL. `sqlite` solo sirve para arrancar sin instalar nada si hiciera
> falta probar rápido.

### 3.3. `Models/ContactoModel.php`

Se encarga de todo lo que toca la tabla `contactos`. No valida nada ni sabe de
HTTP, solo ejecuta SQL.

- **`obtenerContactos($nombre = null)`**
  Si se le pasa un nombre, filtra con `WHERE nombre LIKE '%nombre%'`. Si no,
  devuelve todos. Ordena por `id DESC` para que los últimos añadidos salgan
  arriba.

  ```php
  $statement = $this->connection->prepare(
      "SELECT id, nombre, correo, telefono FROM contactos
       WHERE nombre LIKE :nombre ORDER BY id DESC"
  );
  $statement->execute([":nombre" => '%' . $nombre . '%']);
  ```

  El valor va como parámetro (`:nombre`), nunca concatenado en la cadena SQL:
  eso evita inyección SQL.

- **`obtenerPorId($id)`**
  Devuelve un contacto concreto o `null`. Se usa justo después de crear uno para
  devolver la fila completa (con su `id` nuevo).

- **`crearContacto()`**
  Hace el `INSERT` con los datos que se cargaron antes por los setters. Si va
  bien, devuelve la fila recién creada usando `lastInsertId()`.

- **`eliminarContacto()`**
  Hace el `DELETE WHERE id = :id`. Devuelve `true` solo si borró algo
  (`rowCount() > 0`), para poder distinguir "borrado" de "ese id no existía".

- **Setters / getter**
  `setNombre()`, `setCorreo()`, etc. El controlador rellena el objeto con estos
  métodos antes de llamar a `crearContacto()`.

### 3.4. `Controllers/ContactoController.php`

Recibe las peticiones ya enrutadas y decide la respuesta.

- **`obtenerContactos($nombre)`**
  Pide la lista al modelo y la devuelve como JSON con código `200`.

- **`crearContacto($datos)`**
  1. Limpia los datos con `trim()`.
  2. Valida en el servidor:
     - `nombre`: obligatorio.
     - `correo`: obligatorio y con formato válido
       (`filter_var($correo, FILTER_VALIDATE_EMAIL)`).
     - `telefono`: obligatorio y con formato válido
       (regex `^\+?[0-9\s\-()]{7,20}$`: dígitos, espacios, guiones, paréntesis
       y un `+` opcional al principio; entre 7 y 20 caracteres).
  3. Si hay errores, responde `422` con un objeto que lista el error de cada
     campo:
     ```json
     { "message": "Datos inválidos.", "errors": { "correo": "El correo no tiene un formato válido." } }
     ```
  4. Si todo es correcto, rellena el modelo, guarda y responde `201` con el
     contacto creado.

- **`borrarContacto($id)`**
  Llama al modelo. Si borró, responde `200` con un mensaje. Si no existía,
  responde `404`.

La validación está **duplicada a propósito** en cliente y servidor: el cliente
da respuesta inmediata al usuario, y el servidor es la barrera real (nunca hay
que fiarse de lo que llega del navegador).

### 3.5. `database/schema.sql`

Script que prepara la base de datos. Al ejecutarlo:

```sql
CREATE DATABASE IF NOT EXISTS agenda_contactos CHARACTER SET utf8mb4 ...;
USE agenda_contactos;

DROP TABLE IF EXISTS contactos;
CREATE TABLE contactos (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL,
    correo   VARCHAR(180) NOT NULL,
    telefono VARCHAR(40)  NOT NULL
) ENGINE = InnoDB;

INSERT INTO contactos (nombre, correo, telefono) VALUES
    ('Ana Pérez',  'ana.perez@example.com',  '+34 600 123 456'),
    ...;
```

Crea la base, la tabla y mete 3 contactos de ejemplo para que la tabla no salga
vacía la primera vez.

---

## 4. La API

Base: `http://localhost:8000`

| Método | Ruta               | Qué hace                              |
| ------ | ------------------ | ------------------------------------- |
| GET    | `/contactos`       | Lista todos los contactos            |
| GET    | `/contactos?nombre=ana` | Lista los que contienen "ana" en el nombre |
| POST   | `/contactos`       | Crea un contacto                     |
| DELETE | `/contactos/{id}`  | Elimina el contacto con ese id       |

**Ejemplo de creación**

Petición:

```
POST /contactos
Content-Type: application/json

{ "nombre": "Ana Pérez", "correo": "ana@example.com", "telefono": "+34 600 123 456" }
```

Respuesta correcta (`201`):

```json
{ "id": 4, "nombre": "Ana Pérez", "correo": "ana@example.com", "telefono": "+34 600 123 456" }
```

Respuesta con error de validación (`422`):

```json
{
  "message": "Datos inválidos.",
  "errors": {
    "nombre": "El nombre es obligatorio.",
    "correo": "El correo no tiene un formato válido."
  }
}
```

---

## 5. Frontend (React + Vite + TypeScript)

### 5.1. `main.tsx`

Arranca React y monta el componente `App` dentro del `<div id="root">` de
`index.html`. No tiene lógica.

### 5.2. `App.tsx`

Es el componente principal. Guarda todo el estado de la página con `useState`:

```ts
const [contactos, setContactos]     = useState<Contacto[]>([])   // lista actual
const [filtro, setFiltro]           = useState('')               // texto del input de filtro
const [cargando, setCargando]       = useState(false)            // mostrando "Cargando…"
const [error, setError]             = useState<string | null>(null)
const [eliminandoId, setEliminandoId] = useState<number | null>(null) // fila que se está borrando
```

**Carga de datos con `useEffect`**

```ts
useEffect(() => {
  const id = setTimeout(() => {
    cargarContactos(filtro)
  }, 300)
  return () => clearTimeout(id)
}, [filtro, cargarContactos])
```

Este efecto se ejecuta al montar el componente (carga inicial) y cada vez que
cambia `filtro`. El `setTimeout` de 300 ms es un **debounce**: si el usuario
está escribiendo, no se lanza una petición por cada tecla, solo cuando para de
escribir 300 ms. El `clearTimeout` del `return` cancela la petición anterior si
el usuario sigue tecleando.

`cargarContactos` llama a la API (`getContactos`), guarda el resultado en
`contactos` y controla los estados de carga y error.

**Crear un contacto**

```ts
async function handleCrear(datos: NuevoContacto) {
  const nuevo = await crearContacto(datos)
  setContactos((prev) =>
    nuevo.nombre.toLowerCase().includes(filtro.trim().toLowerCase())
      ? [nuevo, ...prev]
      : prev,
  )
}
```

Llama a la API y añade el contacto devuelto al principio de la lista, pero solo
si encaja con el filtro que hay puesto en ese momento (si no, no tendría sentido
que apareciera). Si la API devuelve error de validación, la excepción sube hasta
el formulario, que la muestra.

**Eliminar un contacto**

```ts
async function handleEliminar(id: number) {
  if (!window.confirm('¿Eliminar este contacto?')) return
  setEliminandoId(id)
  try {
    await eliminarContacto(id)
    setContactos((prev) => prev.filter((c) => c.id !== id))
  } catch {
    setError('No se pudo eliminar el contacto.')
  } finally {
    setEliminandoId(null)
  }
}
```

Pide confirmación, llama a la API y quita el contacto de la lista en memoria sin
tener que recargar todo.

**Render**

Muestra el título, el formulario (`ContactoForm`), el input de filtro y la tabla
(`ContactosTable`). Mientras carga muestra "Cargando…"; si hay error lo muestra
en rojo.

### 5.3. `api/contactos.ts`

Centraliza las llamadas HTTP con **axios**. Crea una instancia con la URL base:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})
```

`import.meta.env.VITE_API_URL` viene del archivo `frontend/.env`. Así la URL del
backend no está escrita en el código.

Exporta tres funciones:

- `getContactos(nombre?)` → `GET /contactos` (añade `?nombre=` si se pasa).
- `crearContacto(payload)` → `POST /contactos`. Si la API responde `422`, axios
  lanza una excepción con `error.response.data.errors` dentro.
- `eliminarContacto(id)` → `DELETE /contactos/{id}`.

### 5.4. `validation.ts`

Función pura que valida el formulario en el cliente, con las mismas reglas que
el servidor:

```ts
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TELEFONO_RE = /^\+?[0-9\s\-()]{7,20}$/

export function validarContacto(datos: NuevoContacto): ErroresValidacion {
  const errores: ErroresValidacion = {}
  if (!datos.nombre.trim())   errores.nombre = 'El nombre es obligatorio.'
  if (!datos.correo.trim())   errores.correo = 'El correo es obligatorio.'
  else if (!EMAIL_RE.test(...)) errores.correo = 'Introduce un correo con formato válido.'
  if (!datos.telefono.trim()) errores.telefono = 'El teléfono es obligatorio.'
  else if (!TELEFONO_RE.test(...)) errores.telefono = 'Introduce un teléfono con formato válido...'
  return errores
}
```

Devuelve un objeto `{ campo: mensaje }`. Si está vacío, el formulario es válido.

### 5.5. `components/ContactoForm.tsx`

El formulario de alta. Estado local:

- `valores`: lo que hay escrito en los tres inputs.
- `errores`: mensajes de error por campo.
- `enviando`: para deshabilitar el botón mientras se envía.
- `errorApi`: error genérico si la API falla por otra cosa.

Al enviar (`handleSubmit`):

1. `e.preventDefault()` para que el navegador no recargue.
2. Llama a `validarContacto()`. Si hay errores, los pinta bajo cada input y
   **no** llama a la API.
3. Si es válido, llama a `onCrear()` (que viene de `App`).
4. Si `onCrear` lanza una excepción `422`, saca los errores de
   `error.response.data.errors` y los muestra. Cualquier otro error muestra un
   mensaje genérico.
5. Si todo va bien, limpia el formulario.

Mientras el usuario corrige un campo, el error de ese campo se borra al escribir
(`actualizar()`).

### 5.6. `components/ContactosTable.tsx`

Componente "tonto": recibe la lista y dos funciones por props y solo pinta.

- Si la lista está vacía muestra "No hay contactos que mostrar."
- Si no, pinta una tabla con Nombre, Correo, Teléfono y un botón **Eliminar** por
  fila.
- El botón se deshabilita y muestra "Eliminando…" mientras esa fila concreta se
  está borrando (`eliminandoId === c.id`).

### 5.7. `types.ts`

Tipos TypeScript que se comparten entre archivos:

```ts
export interface Contacto {
  id: number
  nombre: string
  correo: string
  telefono: string
}
export type NuevoContacto = Omit<Contacto, 'id'>          // para crear (sin id)
export type ErroresValidacion = Partial<Record<keyof NuevoContacto, string>>
```

### 5.8. Configuración

- **`.env`**: `VITE_API_URL=http://localhost:8000`. Vite solo expone al frontend
  las variables que empiezan por `VITE_`.
- **`vite.config.ts`**: activa el plugin de React y fija el puerto 5173.
- **`tsconfig.json`**: opciones de TypeScript, en modo `strict`.
- **`package.json`**: dependencias (`react`, `react-dom`, `axios`) y scripts
  (`dev`, `build`, `preview`).

---

## 6. Flujo completo (qué pasa en cada acción)

**Al abrir la página**

1. React monta `App`.
2. El `useEffect` se dispara y llama a `getContactos()`.
3. axios hace `GET http://localhost:8000/contactos`.
4. `index.php` enruta a `ContactoController::obtenerContactos()`.
5. El controlador pide la lista a `ContactoModel`, que hace el `SELECT`.
6. Vuelve como JSON, axios lo entrega a `App`, que lo guarda en `contactos`.
7. `ContactosTable` pinta las filas.

**Al escribir en el filtro**

1. Cambia `filtro` → se re-ejecuta el `useEffect`.
2. Espera 300 ms (debounce).
3. `GET /contactos?nombre=loEscrito`.
4. El modelo hace `SELECT ... WHERE nombre LIKE '%loEscrito%'`.
5. La tabla se actualiza con el resultado.

**Al crear un contacto**

1. El usuario rellena y envía el formulario.
2. `validarContacto()` comprueba los tres campos en el navegador.
3. Si es válido, `POST /contactos` con el JSON.
4. El controlador vuelve a validar. Si algo falla → `422` y el formulario pinta
   los errores.
5. Si es correcto → `INSERT`, y responde `201` con el contacto (ya con su `id`).
6. `App` añade el contacto a la tabla.

**Al eliminar**

1. Clic en "Eliminar" → `window.confirm()`.
2. `DELETE /contactos/{id}`.
3. El modelo hace el `DELETE`. Responde `200` (o `404` si no existía).
4. `App` quita la fila de la lista.

---

## 7. Cómo se cumplen los requisitos de la prueba

| Requisito                                   | Dónde está |
| ------------------------------------------- | ---------- |
| Página única con tabla de contactos (API)   | `App.tsx` + `ContactosTable.tsx` + `api/contactos.ts` |
| Filtrar por nombre (input)                  | Input en `App.tsx`, filtro real en `ContactoModel::obtenerContactos()` |
| Formulario para crear contacto              | `ContactoForm.tsx` |
| Botón para eliminar contactos               | `ContactosTable.tsx` + `handleEliminar` en `App.tsx` |
| Validación: nombre obligatorio              | `validation.ts` y `ContactoController` |
| Validación: email con formato válido        | `validation.ts` (regex) y `ContactoController` (`FILTER_VALIDATE_EMAIL`) |
| Validación: teléfono requerido y con formato | `validation.ts` y `ContactoController` (regex) |
| Usar fetch o axios                          | axios, en `api/contactos.ts` |
| useState                                    | `App.tsx`, `ContactoForm.tsx` |
| useEffect                                   | `App.tsx` (carga inicial + filtro) |

---

## 8. Decisiones técnicas

- **Sin framework en el backend**: para una API de 3 endpoints, PHP con el
  servidor embebido es más que suficiente y no añade dependencias.
- **PDO con prepared statements**: seguridad frente a inyección SQL sin
  esfuerzo.
- **`.env` en vez de credenciales en el código**: no se sube nada sensible a
  Git (`backend/.env` está en `.gitignore`; solo se versiona `.env.example`).
- **Validación en cliente y servidor**: el cliente para la experiencia de uso,
  el servidor porque es la única barrera fiable.
- **Campo `correo`** (no `email`) en toda la pila para ser consistente con
  `nombre` y `telefono`.
- **Filtro en el servidor** (`LIKE`) en vez de en memoria: funciona igual con
  muchos registros.
- **axios centralizado** en un único archivo: si cambia la URL o hay que añadir
  cabeceras, se toca en un solo sitio.
