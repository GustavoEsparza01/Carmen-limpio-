import { ATRIBUCION_OSM, AVISO_ILUSTRATIVO, COLORES, trazadoDeRuta } from '@carmen-limpio/compartido';
import type { Feature, FeatureCollection } from 'geojson';
import { geoJSON, latLngBounds, type LatLngBounds, type LatLngTuple } from 'leaflet';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';

interface FilaEscenario {
  id: string;
  turno: string;
  carteles: { kmServicio: number; kmTraslado: number };
  propuesta: { kmServicio: number; kmRepaso: number; kmAcceso: number; horas: number };
}

interface DatosEscenarios {
  kmObligatorios: number;
  excluidosKm: Record<string, number>;
  supuestos: { VEL_SERVICIO: number; VEL_TRASLADO: number; HORAS_TURNO: number };
  rutas: FilaEscenario[];
}

interface PropiedadesMapa {
  titulo: string;
  nota: string;
  limites: LatLngBounds;
  children: ReactNode;
}

const LIMITACIONES = [
  'La salida común es un punto supuesto en la carretera 180. No es la base ni el relleno.',
  'No modela viajes al relleno, descargas, descansos, capacidad del camión, giros prohibidos, calles angostas ni privadas con portón.',
  'La ruta V5 del cartel solo tiene 1 de sus 5 lugares ubicado.',
  'Las rutas V1, V2 y V4 del cartel mezclan lugares muy alejados, posiblemente por nombres mal interpretados.',
];

function aLatLng([longitud, latitud]: readonly number[]): LatLngTuple {
  return [latitud ?? 0, longitud ?? 0];
}

function Encuadre({ limites }: { limites: LatLngBounds }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.fitBounds(limites, { padding: [24, 24] });
  }, [mapa, limites]);
  return null;
}

function Mapa({ titulo, nota, limites, children }: PropiedadesMapa) {
  return (
    <section className="tarjeta">
      <h3>{titulo}</h3>
      <p className="suave">{nota}</p>
      <MapContainer bounds={limites} className="mapa" scrollWheelZoom={false}>
        <TileLayer
          attribution={`<a href="https://www.openstreetmap.org/copyright">${ATRIBUCION_OSM}</a>`}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Encuadre limites={limites} />
        {children}
      </MapContainer>
    </section>
  );
}

export function Escenarios() {
  const [datos, setDatos] = useState<DatosEscenarios>();
  const [zonas, setZonas] = useState<FeatureCollection>();
  const [error, setError] = useState(false);
  const [rutaId, setRutaId] = useState('M1');

  useEffect(() => {
    const cargar = (archivo: string) =>
      fetch(`/datos/${archivo}`).then((r) => {
        if (!r.ok) throw new Error(archivo);
        return r.json();
      });
    Promise.all([cargar('escenarios.json'), cargar('propuesta.geojson')])
      .then(([resumen, geometria]) => {
        setDatos(resumen);
        setZonas(geometria);
      })
      .catch(() => setError(true));
  }, []);

  const zona = useMemo<Feature | undefined>(
    () => zonas?.features.find((f) => f.properties?.ruta === rutaId),
    [zonas, rutaId],
  );
  const trazado = trazadoDeRuta(rutaId);
  const limitesCartel = useMemo(
    () => trazado && latLngBounds(trazado.linea.map(aLatLng)),
    [trazado],
  );
  const limitesZona = useMemo(() => zona && geoJSON(zona).getBounds(), [zona]);

  if (error) return <p className="aviso">No se pudieron cargar los datos de la propuesta.</p>;
  if (!datos || !trazado || !limitesCartel || !zona || !limitesZona) return <p>Cargando escenarios…</p>;

  const { supuestos } = datos;

  return (
    <div className="pila">
      <h2>Comparar escenarios</h2>
      <p className="aviso">
        M1, V1 y los demás identificadores no significan lo mismo en ambos escenarios. La zona {rutaId} de la propuesta
        no contiene los lugares de la ruta {rutaId} del cartel, y nunca debe mostrarse a un ciudadano como su ruta.
      </p>

      <label className="selector">
        Ruta o zona
        <select onChange={(e) => setRutaId(e.target.value)} value={rutaId}>
          {datos.rutas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} ({r.turno})
            </option>
          ))}
        </select>
      </label>

      <div className="columnas">
        <Mapa
          limites={limitesCartel}
          nota={`Corredor que une los lugares del cartel. ${AVISO_ILUSTRATIVO}`}
          titulo={`Carteles: ruta ${rutaId}`}
        >
          <Polyline pathOptions={{ color: COLORES.primario, weight: 4 }} positions={trazado.linea.map(aLatLng)} />
          {trazado.paradas.map((p, i) => (
            <CircleMarker
              center={aLatLng(p.coordenadas)}
              key={i}
              pathOptions={{ color: COLORES.primario, fillColor: COLORES.superficie, fillOpacity: 1, weight: 2 }}
              radius={5}
            />
          ))}
        </Mapa>
        <Mapa
          limites={limitesZona}
          nota="Diseño propio que cubre las calles de la zona. No es una ruta real."
          titulo={`Propuesta: zona ${rutaId}`}
        >
          <GeoJSON data={zona} key={rutaId} style={{ color: COLORES.primario, weight: 2 }} />
        </Mapa>
      </div>

      <section className="tarjeta">
        <h3>Distancias y horas estimadas</h3>
        <p className="suave">
          Las horas usan {supuestos.VEL_SERVICIO} km/h recolectando y {supuestos.VEL_TRASLADO} km/h en traslado. Son
          estimaciones, no mediciones. La propuesta cubre {datos.kmObligatorios} km.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Ruta o zona</th>
              <th scope="col" className="numero">
                Carteles: km de servicio
              </th>
              <th scope="col" className="numero">
                Propuesta: km de servicio
              </th>
              <th scope="col" className="numero">
                Propuesta: horas
              </th>
              <th scope="col">Observación</th>
            </tr>
          </thead>
          <tbody>
            {datos.rutas.map((r) => (
              <tr key={r.id} aria-current={r.id === rutaId ? 'true' : undefined}>
                <td>{r.id}</td>
                <td className="numero">{r.carteles.kmServicio}</td>
                <td className="numero">{r.propuesta.kmServicio}</td>
                <td className="numero">{r.propuesta.horas}</td>
                <td>{r.propuesta.horas > supuestos.HORAS_TURNO ? `Supera ${supuestos.HORAS_TURNO} horas` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta">
        <h3>Limitaciones</h3>
        <ul>
          {LIMITACIONES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
