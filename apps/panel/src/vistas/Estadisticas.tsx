import {
  ATRIBUCION_OSM,
  calcularEstadisticas,
  CONSULTA_REPORTES,
  LIMITES_CIUDAD,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  reportesDesdeFilas,
  type Estadisticas as DatosEstadisticas,
  type EstadoReporte,
  type FilaReporte,
  type ReporteParaEstadistica,
  type TipoReporte,
} from '@carmen-limpio/compartido';
import * as L from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { fechaCorta } from '../fechas';
import { supabase } from '../supabase';

// Mismos reportes que la sección Reportes: las cifras deben coincidir con lo guardado.
const LIMITE = 1000;
const ESTADOS = Object.keys(NOMBRE_ESTADO_REPORTE) as EstadoReporte[];
const TIPOS = Object.keys(NOMBRE_TIPO_REPORTE) as TipoReporte[];

// Una sola gama (magnitud): de acento claro a acento oscuro.
const GRADIENTE = { 0.2: '#f6c88f', 0.5: '#d9822b', 0.8: '#a4520f', 1: '#7c3a06' };

function CapaCalor({ puntos }: { puntos: DatosEstadisticas['puntos'] }) {
  const mapa = useMap();
  useEffect(() => {
    let capa: L.Layer | undefined;
    let vigente = true;
    // leaflet.heat espera la variable global L.
    (window as unknown as { L: typeof L }).L = L;
    import('leaflet.heat').then(() => {
      if (!vigente || puntos.length === 0) return;
      const maximo = Math.max(...puntos.map((p) => p.peso));
      capa = L.heatLayer(
        puntos.map((p) => [p.coordenadas[1], p.coordenadas[0], p.peso] as L.HeatLatLngTuple),
        { radius: 28, blur: 22, max: maximo, minOpacity: 0.35, gradient: GRADIENTE },
      ).addTo(mapa);
    });
    return () => {
      vigente = false;
      capa?.remove();
    };
  }, [mapa, puntos]);
  return null;
}

function Barras({ semanas }: { semanas: DatosEstadisticas['porSemana'] }) {
  const maximo = Math.max(1, ...semanas.map((s) => s.total));
  return (
    <div className="barras" role="img" aria-label="Reportes por semana; los valores están en la tabla siguiente">
      {semanas.map((s) => (
        <div className="barra-columna" key={s.lunes} title={`Semana del ${fechaCorta(s.lunes)}: ${s.total} reportes`}>
          <div className="barra-area">
            <div className="barra" style={{ height: `${(s.total / maximo) * 100}%` }} />
          </div>
          <span className="barra-etiqueta">{fechaCorta(s.lunes).slice(0, 5)}</span>
        </div>
      ))}
    </div>
  );
}

export function Estadisticas() {
  const [reportes, setReportes] = useState<ReporteParaEstadistica[]>();
  const [error, setError] = useState<string>();

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fallo } = await supabase
      .from('reportes_detalle')
      .select(`${CONSULTA_REPORTES}, incidencia_id`)
      .order('creado', { ascending: false })
      .limit(LIMITE);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    const filas = (data ?? []) as unknown as (FilaReporte & { incidencia_id: number | null })[];
    const incidencia = new Map(filas.map((f) => [f.id, f.incidencia_id]));
    setReportes(reportesDesdeFilas(filas).map((r) => ({ ...r, incidenciaId: incidencia.get(r.id) ?? null })));
    setError(undefined);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const datos = useMemo(() => (reportes ? calcularEstadisticas(reportes, new Date()) : undefined), [reportes]);

  if (error) {
    return (
      <p className="aviso" role="alert">
        No se pudieron cargar las estadísticas: {error}
      </p>
    );
  }
  if (!datos || !reportes) return <p className="suave">Cargando estadísticas…</p>;

  const [oeste, sur, este, norte] = LIMITES_CIUDAD;
  const cifras: { etiqueta: string; valor: string; nota?: string }[] = [
    { etiqueta: 'Reportes', valor: String(datos.total), nota: reportes.length === LIMITE ? `Los ${LIMITE} más recientes` : undefined },
    { etiqueta: 'Pendientes', valor: String(datos.pendientes), nota: 'Recibidos o en revisión' },
    { etiqueta: 'Atendidos', valor: String(datos.porEstado.atendido) },
    { etiqueta: 'Rechazados', valor: String(datos.porEstado.rechazado) },
    { etiqueta: 'Incidencias', valor: String(datos.incidencias), nota: '“No pasó” del mismo lugar y fecha' },
    {
      etiqueta: 'Tiempo de cierre',
      valor: datos.horasMedianaCierre === null ? '—' : `${datos.horasMedianaCierre.toFixed(1)} h`,
      nota: 'Mediana, del envío a atendido o rechazado',
    },
  ];

  return (
    <div className="pila">
      <div className="titulo-accion">
        <h2>Estadísticas</h2>
        <button className="boton boton-claro" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>
      <p className="suave">
        Calculadas con los reportes guardados. Los atiende el equipo del proyecto como demostración; no son cifras
        oficiales.
      </p>

      <div className="cifras">
        {cifras.map((c) => (
          <section className="tarjeta" key={c.etiqueta}>
            <p className="cifra-etiqueta">{c.etiqueta}</p>
            <p className="cifra">{c.valor}</p>
            {c.nota && <p className="suave">{c.nota}</p>}
          </section>
        ))}
      </div>

      <div className="columnas">
        <section className="tarjeta pila">
          <h3>Reportes por semana</h3>
          <Barras semanas={datos.porSemana} />
          <table>
            <caption className="solo-lector">Reportes por semana</caption>
            <thead>
              <tr>
                <th scope="col">Semana del</th>
                <th className="numero" scope="col">
                  Reportes
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.porSemana
                .filter((s) => s.total > 0)
                .map((s) => (
                  <tr key={s.lunes}>
                    <td>{fechaCorta(s.lunes)}</td>
                    <td className="numero">{s.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        <section className="tarjeta pila">
          <h3>Por tipo y estado</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                {ESTADOS.map((e) => (
                  <th className="numero" key={e} scope="col">
                    {NOMBRE_ESTADO_REPORTE[e]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIPOS.map((t) => (
                <tr key={t}>
                  <td>{NOMBRE_TIPO_REPORTE[t]}</td>
                  {ESTADOS.map((e) => (
                    <td className="numero" key={e}>
                      {datos.porTipo[t][e]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Lugares con más reportes</h3>
          {datos.lugares.length === 0 ? (
            <p className="suave">Aún no hay reportes con lugar.</p>
          ) : (
            <ol>
              {datos.lugares.map((l) => (
                <li key={l.lugarId}>
                  {lugarPorId(l.lugarId)?.nombre ?? l.lugarId}: {l.total}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="tarjeta pila">
        <h3>Mapa de calor</h3>
        <p className="suave">
          Cada reporte cuenta en el punto marcado o, si no lo tiene, en la ubicación ilustrativa de su lugar. Más oscuro,
          más reportes.
          {datos.sinUbicacion > 0 && ` ${datos.sinUbicacion} reportes son de lugares sin ubicar y no aparecen.`}
        </p>
        <MapContainer
          bounds={[
            [sur, oeste],
            [norte, este],
          ]}
          className="mapa"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution={`<a href="https://www.openstreetmap.org/copyright">${ATRIBUCION_OSM}</a>`}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CapaCalor puntos={datos.puntos} />
        </MapContainer>
      </section>
    </div>
  );
}
