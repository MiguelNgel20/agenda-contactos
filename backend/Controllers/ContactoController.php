<?php

class ContactoController {
    private $contacto;

    public function __construct($contacto){
        $this->contacto = $contacto;
    }

    public function obtenerContactos($nombre = null){
        $contactos = $this->contacto->obtenerContactos($nombre);
        http_response_code(200);
        echo json_encode($contactos);
    }

    public function crearContacto($datos){
        $nombre   = trim($datos['nombre']   ?? '');
        $correo   = trim($datos['correo']   ?? '');
        $telefono = trim($datos['telefono'] ?? '');

        // Validación del lado del servidor
        $errores = [];

        if ($nombre === '') {
            $errores['nombre'] = 'El nombre es obligatorio.';
        }
        if ($correo === '') {
            $errores['correo'] = 'El correo es obligatorio.';
        } elseif (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $errores['correo'] = 'El correo no tiene un formato válido.';
        }
        if ($telefono === '') {
            $errores['telefono'] = 'El teléfono es obligatorio.';
        } elseif (!preg_match('/^\+?[0-9\s\-()]{7,20}$/', $telefono)) {
            $errores['telefono'] = 'El teléfono no tiene un formato válido.';
        }

        if ($errores !== []) {
            http_response_code(422);
            echo json_encode([
                'message' => 'Datos inválidos.',
                'errors'  => $errores,
            ]);
            return;
        }

        // Llenar el objeto
        $this->contacto->setNombre($nombre);
        $this->contacto->setCorreo($correo);
        $this->contacto->setTelefono($telefono);

        // Guardar y responder
        $creado = $this->contacto->crearContacto();

        if ($creado) {
            http_response_code(201);
            echo json_encode($creado);
        } else {
            http_response_code(500);
            echo json_encode(['message' => 'No se pudo crear el contacto']);
        }
    }

    public function borrarContacto($id){
        $this->contacto->setId($id);

        if ($this->contacto->eliminarContacto()) {
            http_response_code(200);
            echo json_encode(['message' => 'Contacto eliminado correctamente']);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'No se pudo borrar el contacto']);
        }
    }
}
