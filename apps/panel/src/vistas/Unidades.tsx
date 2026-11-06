import { UNIDADES } from '@carmen-limpio/compartido';

export function Unidades() {
  return (
    <div className="pila">
      <h2>Unidades y asignaciones</h2>
      <p className="aviso">
        Supuesto pendiente de confirmar: un mismo vehículo cubre ambos turnos. Las placas y los demás datos reales
        siguen pendientes.
      </p>
      <section className="tarjeta">
        <table>
          <thead>
            <tr>
              <th scope="col">Unidad</th>
              <th scope="col">Turno matutino</th>
              <th scope="col">Turno vespertino</th>
              <th scope="col">Placas</th>
            </tr>
          </thead>
          <tbody>
            {UNIDADES.map((u) => (
              <tr key={u.numero}>
                <td>Unidad {u.numero}</td>
                <td>{u.matutina ?? 'Sin ruta'}</td>
                <td>{u.vespertina ?? 'Sin ruta'}</td>
                <td>Pendiente</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
