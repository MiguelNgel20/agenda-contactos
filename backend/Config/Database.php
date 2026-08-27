<?php

/**
 * Conexión a base de datos mediante PDO.
 *
 * Configuración por defecto: MySQL en 127.0.0.1:3306, base `agenda_contactos`.
 * Puedes sobreescribir cualquier valor con variables de entorno:
 *   DB_DRIVER (mysql | pgsql | sqlite)   DB_HOST   DB_PORT
 *   DB_NAME   DB_USER   DB_PASS
 *
 * El driver `sqlite` existe solo para poder probar sin instalar un motor de BD
 * (crea el fichero backend/storage/contactos.sqlite y la tabla al vuelo).
 */
class Database
{
    private string $driver;
    private string $host;
    private string $port;
    private string $name;
    private string $user;
    private string $pass;

    private ?PDO $pdo = null;

    public function __construct()
    {
        $this->driver = getenv('DB_DRIVER') ?: 'mysql';
        $this->host   = getenv('DB_HOST')   ?: '127.0.0.1';
        $this->port   = getenv('DB_PORT')   ?: ($this->driver === 'pgsql' ? '5432' : '3306');
        $this->name   = getenv('DB_NAME')   ?: 'agenda_contactos';
        $this->user   = getenv('DB_USER')   ?: 'root';
        $this->pass   = getenv('DB_PASS')   ?: '';
    }

    public function connection(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $this->pdo = new PDO($this->dsn(), $this->user, $this->pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        if ($this->driver === 'sqlite') {
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS contactos (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre   VARCHAR(120) NOT NULL,
                    correo   VARCHAR(180) NOT NULL,
                    telefono VARCHAR(40)  NOT NULL
                )'
            );
        }

        return $this->pdo;
    }

    private function dsn(): string
    {
        return match ($this->driver) {
            'sqlite' => 'sqlite:' . $this->sqlitePath(),
            'pgsql'  => "pgsql:host={$this->host};port={$this->port};dbname={$this->name}",
            default  => "mysql:host={$this->host};port={$this->port};dbname={$this->name};charset=utf8mb4",
        };
    }

    private function sqlitePath(): string
    {
        $dir = __DIR__ . '/../storage';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        return $dir . '/contactos.sqlite';
    }
}
