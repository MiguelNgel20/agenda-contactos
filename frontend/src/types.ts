export interface Contacto {
  id: number
  nombre: string
  correo: string
  telefono: string
}

/** Datos que se envían al crear un contacto (sin id). */
export type NuevoContacto = Omit<Contacto, 'id'>

/** Errores de validación por campo devueltos por la API (422). */
export type ErroresValidacion = Partial<Record<keyof NuevoContacto, string>>
