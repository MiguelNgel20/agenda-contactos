import type { NuevoContacto, ErroresValidacion } from './types'

// Formato de email razonable (algo@algo.tld)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Teléfono: dígitos, espacios, guiones, paréntesis y un + inicial opcional. Entre 7 y 20 dígitos.
const TELEFONO_RE = /^\+?[0-9\s\-()]{7,20}$/

/**
 * Valida un contacto en el cliente.
 * Devuelve un objeto con un mensaje por cada campo inválido (vacío si todo es correcto).
 */
export function validarContacto(datos: NuevoContacto): ErroresValidacion {
  const errores: ErroresValidacion = {}

  const nombre = datos.nombre.trim()
  const correo = datos.correo.trim()
  const telefono = datos.telefono.trim()

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.'
  }

  if (!correo) {
    errores.correo = 'El correo es obligatorio.'
  } else if (!EMAIL_RE.test(correo)) {
    errores.correo = 'Introduce un correo con formato válido.'
  }

  if (!telefono) {
    errores.telefono = 'El teléfono es obligatorio.'
  } else if (!TELEFONO_RE.test(telefono)) {
    errores.telefono = 'Introduce un teléfono con formato válido (7-20 dígitos).'
  }

  return errores
}
