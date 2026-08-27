import { useState, type FormEvent } from 'react'
import type { NuevoContacto, ErroresValidacion } from '../types'
import { validarContacto } from '../validation'

interface Props {
  onCrear: (datos: NuevoContacto) => Promise<void>
}

const VACIO: NuevoContacto = { nombre: '', correo: '', telefono: '' }

export default function ContactoForm({ onCrear }: Props) {
  const [valores, setValores] = useState<NuevoContacto>(VACIO)
  const [errores, setErrores] = useState<ErroresValidacion>({})
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  function actualizar(campo: keyof NuevoContacto, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }))
    // Limpia el error del campo mientras el usuario lo corrige
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorApi(null)

    const erroresValidacion = validarContacto(valores)
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    setEnviando(true)
    try {
      await onCrear({
        nombre: valores.nombre.trim(),
        correo: valores.correo.trim(),
        telefono: valores.telefono.trim(),
      })
      setValores(VACIO)
      setErrores({})
    } catch (err: unknown) {
      // Errores de validación del backend (422) o error genérico
      const apiErrores = getApiErrores(err)
      if (apiErrores) {
        setErrores(apiErrores)
      } else {
        setErrorApi('No se pudo crear el contacto. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Nuevo contacto</h2>

      <div className="field">
        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          type="text"
          value={valores.nombre}
          onChange={(e) => actualizar('nombre', e.target.value)}
          aria-invalid={!!errores.nombre}
        />
        {errores.nombre && <span className="error">{errores.nombre}</span>}
      </div>

      <div className="field">
        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          type="email"
          value={valores.correo}
          onChange={(e) => actualizar('correo', e.target.value)}
          aria-invalid={!!errores.correo}
        />
        {errores.correo && <span className="error">{errores.correo}</span>}
      </div>

      <div className="field">
        <label htmlFor="telefono">Teléfono</label>
        <input
          id="telefono"
          type="tel"
          value={valores.telefono}
          onChange={(e) => actualizar('telefono', e.target.value)}
          aria-invalid={!!errores.telefono}
          placeholder="+34 600 123 456"
        />
        {errores.telefono && <span className="error">{errores.telefono}</span>}
      </div>

      {errorApi && <p className="error">{errorApi}</p>}

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Crear contacto'}
      </button>
    </form>
  )
}

/** Extrae { campo: mensaje } de una respuesta 422 de axios, si existe. */
function getApiErrores(err: unknown): ErroresValidacion | null {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: unknown }).response === 'object'
  ) {
    const response = (err as { response?: { status?: number; data?: { errors?: ErroresValidacion } } })
      .response
    if (response?.status === 422 && response.data?.errors) {
      return response.data.errors
    }
  }
  return null
}
