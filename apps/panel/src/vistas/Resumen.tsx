import {
  contarConfianza,
  entradasSinUbicar,
  ETIQUETA_CONFIANZA,
  LUGARES,
  RUTAS,
  UNIDADES,
  type Confianza,
} from '@carmen-limpio/compartido';

const NIVELES: Confianza[] = ['alta', 'media', 'baja', 'ninguna'];

const PENDIENTES = [
  '¿Un vehículo cubre ambos turnos? Se asume que sí, con 8 unidades.',
  '¿Se reparten mejor las 4 zonas largas de la propuesta?',
  'Base de camiones, relleno y capacidad.',
  'Límites oficiales de colonias.',
  'Ubicación de los lugares sin ubicar.',
];

export function Resumen() {
  const conteo = contarConfianza();
  const entradas = NIVELES.reduce((total, nivel) => total + conteo[nivel], 0);
  const matutinas = RUTAS.filter((r) => r.turno === 'matutino').length;
  const cifras = [
    {
      valor: RUTAS.length,
      etiqueta: 'Rutas',
      detalle: `${matutinas} matutinas y ${RUTAS.length - matutinas} vespertinas`,
    },
    { valor: LUGARES.length, etiqueta: 'Lugares', detalle: `${entradas} entradas en los carteles` },
    { valor: conteo.ninguna, etiqueta: 'Entradas sin ubicar', detalle: 'Tienen horario, pero no mapa' },
    { valor: UNIDADES.length, etiqueta: 'Unidades', detalle: 'Supuesto sin confirmar' },
  ];

  return (
    <div className="pila">
      <h2>Resumen</h2>
      <section className="cifras" aria-label="Cifras principales">
        {cifras.map((c) => (
          <div className="tarjeta" key={c.etiqueta}>
            <p className="cifra">{c.valor}</p>
            <p className="cifra-etiqueta">{c.etiqueta}</p>
            <p className="suave">{c.detalle}</p>
          </div>
        ))}
      </section>

      <div className="columnas">
        <section className="tarjeta">
          <h3>Confianza de ubicación</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Nivel</th>
                <th scope="col" className="numero">
                  Entradas
                </th>
                <th scope="col" className="numero">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody>
              {NIVELES.map((nivel) => (
                <tr key={nivel}>
                  <td>{ETIQUETA_CONFIANZA[nivel]}</td>
                  <td className="numero">{conteo[nivel]}</td>
                  <td className="numero">{Math.round((conteo[nivel] / entradas) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="tarjeta">
          <h3>Decisiones pendientes</h3>
          <ul>
            {PENDIENTES.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="tarjeta">
        <h3>Entradas sin ubicar</h3>
        <table>
          <thead>
            <tr>
              <th scope="col">Lugar</th>
              <th scope="col">Ruta</th>
            </tr>
          </thead>
          <tbody>
            {entradasSinUbicar().map(({ lugar, rutaId }) => (
              <tr key={`${rutaId}-${lugar.id}`}>
                <td>{lugar.nombre}</td>
                <td>{rutaId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
