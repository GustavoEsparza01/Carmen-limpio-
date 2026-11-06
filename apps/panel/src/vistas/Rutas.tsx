import {
  AVISO_POR_CONFIRMAR,
  DIAS_CARTEL,
  ETIQUETA_CONFIANZA,
  etiquetaRuta,
  listaDias,
  notaExcepcion,
  RUTAS,
  textoHorario,
  UNIDADES,
} from '@carmen-limpio/compartido';
import { useState } from 'react';

export function Rutas() {
  const [rutaId, setRutaId] = useState('M1');
  const ruta = RUTAS.find((r) => r.id === rutaId) ?? RUTAS[0]!;
  const unidad = UNIDADES.find((u) => u.matutina === ruta.id || u.vespertina === ruta.id);

  return (
    <div className="pila">
      <h2>Rutas</h2>
      <div className="maestro-detalle">
        <section className="tarjeta" aria-label="Lista de rutas">
          <ul className="lista-rutas">
            {RUTAS.map((r) => (
              <li key={r.id}>
                <button
                  aria-pressed={r.id === ruta.id}
                  className="fila-ruta"
                  onClick={() => setRutaId(r.id)}
                  type="button"
                >
                  <span>{etiquetaRuta(r)}</span>
                  <span>{r.paradas.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta">
          <h3>
            {ruta.id} · {etiquetaRuta(ruta)}
          </h3>
          <p className="suave">
            {textoHorario(DIAS_CARTEL, ruta.turno)} · Unidad {unidad?.numero} (supuesto)
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Lugar</th>
                <th scope="col">Días</th>
                <th scope="col">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {ruta.paradas.map(({ lugar, horario }) => (
                <tr key={lugar.id}>
                  <td>{lugar.nombre}</td>
                  <td>
                    {notaExcepcion(horario.dias) ?? listaDias(horario.dias)}
                    {horario.porConfirmar && <p className="nota">{AVISO_POR_CONFIRMAR}</p>}
                  </td>
                  <td>{ETIQUETA_CONFIANZA[horario.confianza]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
