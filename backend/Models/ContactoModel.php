<?php

class ContactoModel {

    private $id;
    private $nombre;
    private $correo;
    private $telefono;
    private PDO $connection;

    public function __construct($db){
        $this->connection = $db;
    }

    public function obtenerContactos($nombre = null){
        if ($nombre !== null && $nombre !== '') {
            $statement = $this->connection->prepare(
                "SELECT id, nombre, correo, telefono FROM contactos
                 WHERE nombre LIKE :nombre ORDER BY id DESC"
            );
            $statement->execute([":nombre" => '%' . $nombre . '%']);
            return $statement->fetchAll(PDO::FETCH_ASSOC);
        }

        $statement = $this->connection->prepare(
            "SELECT id, nombre, correo, telefono FROM contactos ORDER BY id DESC"
        );
        $statement->execute();
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function obtenerPorId($id){
        $statement = $this->connection->prepare(
            "SELECT id, nombre, correo, telefono FROM contactos WHERE id = :id"
        );
        $statement->execute([":id" => $id]);
        $fila = $statement->fetch(PDO::FETCH_ASSOC);
        return $fila ?: null;
    }

    public function crearContacto(){
        $query = "INSERT INTO contactos (nombre, correo, telefono) VALUES (:nombre, :correo, :telefono)";
        $statement = $this->connection->prepare($query);
        $statement->bindParam(":nombre", $this->nombre);
        $statement->bindParam(":correo", $this->correo);
        $statement->bindParam(":telefono", $this->telefono);

        if (!$statement->execute()) {
            return null;
        }

        return $this->obtenerPorId((int) $this->connection->lastInsertId());
    }

    public function eliminarContacto(){
        $query = "DELETE FROM contactos WHERE id = :id";
        $statement = $this->connection->prepare($query);
        $statement->bindParam(":id", $this->id);
        return $statement->execute() && $statement->rowCount() > 0;
    }

    // Setters (para llenar el objeto desde el controller)
    public function setId($id){ $this->id = $id; }
    public function setNombre($nombre){ $this->nombre = $nombre; }
    public function setCorreo($correo){ $this->correo = $correo; }
    public function setTelefono($telefono){ $this->telefono = $telefono; }

    // Getter
    public function getId(){ return $this->id; }
}
