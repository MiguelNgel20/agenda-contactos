import axios from 'axios'
import type { Contacto, NuevoContacto } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

/** Lista los contactos. Si se pasa `nombre`, filtra en el servidor. */
export async function getContactos(nombre?: string): Promise<Contacto[]> {
  const { data } = await api.get<Contacto[]>('/contactos', {
    params: nombre ? { nombre } : undefined,
  })
  return data
}

/** Crea un contacto. Lanza el error de axios (con response.data.errors) si la API responde 422. */
export async function crearContacto(payload: NuevoContacto): Promise<Contacto> {
  const { data } = await api.post<Contacto>('/contactos', payload)
  return data
}

/** Elimina un contacto por id. */
export async function eliminarContacto(id: number): Promise<void> {
  await api.delete(`/contactos/${id}`)
}
