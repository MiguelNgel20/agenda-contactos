import { useCallback, useEffect, useState } from 'react'
import type { Contacto, NuevoContacto } from './types'
import { crearContacto, eliminarContacto, getContactos } from './api/contactos'
import ContactoForm from './components/ContactoForm'
import ContactosTable from './components/ContactosTable'

export default function App() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  const cargarContactos = useCallback(async (nombre: string) => {
    setCargando(true)
    setError(null)
    try {
      const datos = await getContactos(nombre.trim() || undefined)
      setContactos(datos)
    } catch {
      setError('No se pudieron cargar los contactos. ¿Está el backend en marcha?')
    } finally {
      setCargando(false)
    }
  }, [])

  // Carga inicial + recarga cuando cambia el filtro (con debounce de 300 ms)
  useEffect(() => {
    const id = setTimeout(() => {
      cargarContactos(filtro)
    }, 300)
    return () => clearTimeout(id)
  }, [filtro, cargarContactos])

  async function handleCrear(datos: NuevoContacto) {
    const nuevo = await crearContacto(datos)
    // Añade a la lista solo si encaja con el filtro actual
    setContactos((prev) =>
      nuevo.nombre.toLowerCase().includes(filtro.trim().toLowerCase())
        ? [nuevo, ...prev]
        : prev,
    )
  }

  async function handleEliminar(id: number) {
    if (!window.confirm('¿Eliminar este contacto?')) return
    setEliminandoId(id)
    setError(null)
    try {
      await eliminarContacto(id)
      setContactos((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('No se pudo eliminar el contacto.')
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <main className="contenedor">
      <header>
        <h1>Agenda de Contactos</h1>
      </header>

      <ContactoForm onCrear={handleCrear} />

      <section className="card">
        <div className="tabla-cabecera">
          <h2>Contactos</h2>
          <input
            type="search"
            placeholder="Filtrar por nombre…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar por nombre"
          />
        </div>

        {error && <p className="error">{error}</p>}
        {cargando ? (
          <p className="vacio">Cargando…</p>
        ) : (
          <ContactosTable
            contactos={contactos}
            onEliminar={handleEliminar}
            eliminandoId={eliminandoId}
          />
        )}
      </section>
    </main>
  )
}
