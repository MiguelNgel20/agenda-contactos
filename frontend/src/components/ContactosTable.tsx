import type { Contacto } from '../types'

interface Props {
  contactos: Contacto[]
  onEliminar: (id: number) => void
  eliminandoId: number | null
}

export default function ContactosTable({ contactos, onEliminar, eliminandoId }: Props) {
  if (contactos.length === 0) {
    return <p className="vacio">No hay contactos que mostrar.</p>
  }

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {contactos.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.correo}</td>
              <td>{c.telefono}</td>
              <td>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => onEliminar(c.id)}
                  disabled={eliminandoId === c.id}
                >
                  {eliminandoId === c.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
