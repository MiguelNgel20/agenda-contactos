<?php

/**
 * Punto de entrada de la API de contactos.
 *
 * Arrancar (modo router del servidor embebido de PHP), desde backend/:
 *   php -S localhost:8000 index.php
 */

// --- Carga backend/.env (si existe) a variables de entorno ---
$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);
        if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) {
            continue;
        }
        [$clave, $valor] = array_map('trim', explode('=', $linea, 2));
        if (getenv($clave) === false) {
            putenv("$clave=$valor");
        }
    }
}

// --- CORS (el frontend de Vite corre en otro puerto) ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/Config/Database.php';
require_once __DIR__ . '/Models/ContactoModel.php';
require_once __DIR__ . '/Controllers/ContactoController.php';

$database = new Database();
$db = $database->connection();
$contacto = new ContactoModel($db);
$contactoController = new ContactoController($contacto);

$method = $_SERVER['REQUEST_METHOD'];
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
