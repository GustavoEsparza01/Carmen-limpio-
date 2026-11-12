import {
  ATRIBUCION_OSM,
  BUCKET_FOTOS_REPORTES,
  CONSULTA_REPORTES,
  LARGO_MAXIMO_NOTA,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  reportesDesdeFilas,
  siguientesEstados,
  validarCambioEstado,
  type EstadoReporte,
  type FilaReporte,
  type Reporte,
  type TipoReporte,
} from '@carmen-limpio/compartido';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import { fechaCorta, fechaLegible } from '../fechas';
import { supabase } from '../supabase';

// Reportes de vecinos. Los atiende el equipo del proyecto como demostración: no llegan a ninguna autoridad.

interface ReportePanel extends Reporte {
  autor: string;
  incidenciaId: number | null;
}

type FiltroEstado = 'pendientes' | 'todos' | EstadoReporte;
type FiltroTipo = 'todos' | TipoReporte;

const LIMITE = 500;
const PENDIENTES: readonly EstadoReporte[] = ['recibido', 'enRevision'];
const CLASE_ESTADO: Record<EstadoReporte, string> = {
  recibido: 'insignia insignia-acento',
  enRevision: 'insignia insignia-acento',
  atendido: 'insignia insignia-ok',
  rechazado: 'insignia',
};

const nombreLugar = (id?: string) => (id ? (lugarPorId(id)?.nombre ?? id) : 'Punto en el mapa');
// Sin correo: basta un identificador corto para ver si una misma persona reporta varias veces.
const persona = (autor: string) => `Persona ${autor.slice(0, 8)}`;

export function Reportes() {
  const [reportes, setReportes] = useState<ReportePanel[]>();
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<FiltroEstado>('pendientes');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [vista, setVista] = useState<'reportes' | 'incidencias'>('reportes');
  const [elegidoId, setElegidoId] = useState<string>();

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fallo } = await supabase
      .from('reportes_detalle')
      .select(`${CONSULTA_REPORTES}, autor, incidencia_id`)
      .order('creado', { ascending: false })
      .limit(LIMITE);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    const filas = (data ?? []) as unknown as (FilaReporte & { autor: string; incidencia_id: number | null })[];
    const extra = new Map(filas.map((f) => [f.id, f]));
    setReportes(
      reportesDesdeFilas(filas).map((r) => ({
        ...r,
        autor: extra.get(r.id)!.autor,
        incidenciaId: extra.get(r.id)!.incidencia_id,
      })),
    );
    setError(undefined);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(
    () =>
      (reportes ?? []).filter(
        (r) =>
          (estado === 'todos' || (estado === 'pendientes' ? PENDIENTES.includes(r.estado) : r.estado === estado)) &&
          (tipo === 'todos' || r.tipo === tipo),
      ),
    [reportes, estado, tipo],
  );

  const incidencias = useMemo(() => {
    const grupos = new Map<number, ReportePanel[]>();
    for (const r of reportes ?? []) {
      if (r.incidenciaId === null) continue;
      grupos.set(r.incidenciaId, [...(grupos.get(r.incidenciaId) ?? []), r]);
    }
    return [...grupos.entries()]
      .map(([id, lista]) => ({ id, lista, lugarId: lista[0]!.lugarId, fecha: lista[0]!.fecha ?? '' }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.lista.length - a.lista.length);
  }, [reportes]);

  const elegido = reportes?.find((r) => r.id === elegidoId);

  if (!supabase) return <p className="aviso">Supabase no está configurado.</p>;
  if (error) {
    return (
      <p className="aviso" role="alert">
        No se pudieron cargar los reportes: {error}
      </p>
    );
  }
  if (!reportes) return <p className="suave">Cargando reportes…</p>;

  const pendientes = reportes.filter((r) => PENDIENTES.includes(r.estado)).length;

  return (
    <div className="pila">
      <div className="titulo-accion">
        <h2>Reportes</h2>
        <button className="boton boton-claro" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>
      <p className="suave">
        {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
        {reportes.length === LIMITE ? ` (los ${LIMITE} más recientes)` : ''} · {pendientes}{' '}
        {pendientes === 1 ? 'pendiente' : 'pendientes'}. Los atiende el equipo del proyecto como demostración; no llegan al municipio ni a la empresa recolectora.
      </p>

      <div className="acciones">
        <label className="selector">
          Ver
          <select onChange={(e) => setVista(e.target.value as typeof vista)} value={vista}>
            <option value="reportes">Reportes</option>
            <option value="incidencias">Incidencias de “El camión no pasó”</option>
          </select>
        </label>
        {vista === 'reportes' && (
          <>
            <label className="selector">
              Estado
              <select onChange={(e) => setEstado(e.target.value as FiltroEstado)} value={estado}>
                <option value="pendientes">Pendientes</option>
                <option value="todos">Todos</option>
                {(Object.keys(NOMBRE_ESTADO_REPORTE) as EstadoReporte[]).map((e) => (
                  <option key={e} value={e}>
                    {NOMBRE_ESTADO_REPORTE[e]}
                  </option>
                ))}
              </select>
            </label>
            <label className="selector">
              Tipo
              <select onChange={(e) => setTipo(e.target.value as FiltroTipo)} value={tipo}>
                <option value="todos">Todos</option>
                {(Object.keys(NOMBRE_TIPO_REPORTE) as TipoReporte[]).map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO_REPORTE[t]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {vista === 'incidencias' ? (
        <section className="tarjeta">
          <p className="suave">
            Varios “no pasó” del mismo lugar y fecha forman una incidencia. Cada persona conserva su propio reporte.
          </p>
          {incidencias.length === 0 ? (
            <p>Aún no hay incidencias.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Lugar</th>
                  <th scope="col">Fecha</th>
                  <th className="numero" scope="col">
                    Reportes
                  </th>
                  <th className="numero" scope="col">
                    Pendientes
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidencias.map((i) => (
                  <tr key={i.id}>
                    <td>{nombreLugar(i.lugarId)}</td>
                    <td>{i.fecha ? fechaCorta(i.fecha) : '—'}</td>
                    <td className="numero">{i.lista.length}</td>
                    <td className="numero">{i.lista.filter((r) => PENDIENTES.includes(r.estado)).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <div className="maestro-detalle">
          <section className="tarjeta" aria-label="Lista de reportes">
            {visibles.length === 0 ? (
              <p className="suave">No hay reportes con estos filtros.</p>
            ) : (
              <ul className="lista-rutas">
                {visibles.map((r) => (
                  <li key={r.id}>
                    <button
                      aria-pressed={r.id === elegidoId}
                      className="fila-ruta fila-reporte"
                      onClick={() => setElegidoId(r.id)}
                      type="button"
                    >
                      <span>
                        <strong>{NOMBRE_TIPO_REPORTE[r.tipo]}</strong>
                        <br />
                        <span className="suave">
                          {nombreLugar(r.lugarId)} · {fechaLegible(r.creado)}
                        </span>
                      </span>
                      <span className={CLASE_ESTADO[r.estado]}>{NOMBRE_ESTADO_REPORTE[r.estado]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {elegido ? (
            <Detalle
              // Al cambiar de estado se reinicia el formulario con las nuevas opciones.
              key={`${elegido.id}-${elegido.estado}`}
              mismaIncidencia={reportes.filter((r) => r.incidenciaId !== null && r.incidenciaId === elegido.incidenciaId).length}
              onCambiado={cargar}
              reporte={elegido}
            />
          ) : (
            <section className="tarjeta">
              <p className="suave">Elige un reporte para ver su detalle y cambiar su estado.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Detalle({
  reporte,
  mismaIncidencia,
  onCambiado,
}: {
  reporte: ReportePanel;
  mismaIncidencia: number;
  onCambiado: () => Promise<void>;
}) {
  const siguientes = siguientesEstados(reporte.estado);
  const [nuevo, setNuevo] = useState<EstadoReporte | undefined>(siguientes[0]);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [foto, setFoto] = useState<string | null>();

  useEffect(() => {
    if (!reporte.foto || !supabase) return;
    let vigente = true;
    supabase.storage
      .from(BUCKET_FOTOS_REPORTES)
      .createSignedUrl(reporte.foto, 3600)
      .then(({ data }) => vigente && setFoto(data?.signedUrl ?? null));
    return () => {
      vigente = false;
    };
  }, [reporte.foto]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !nuevo || guardando) return;
    const problema = validarCambioEstado(reporte.estado, nuevo, nota);
    if (problema) {
      setError(problema);
      return;
    }
    setGuardando(true);
    setError(undefined);
    const { error: fallo } = await supabase
      .from('reportes')
      .update({ estado: nuevo, nota: nota.trim() })
      .eq('id', reporte.id);
    if (fallo) {
      setError(fallo.message);
      setGuardando(false);
      return;
    }
    await onCambiado();
  };

  return (
    <section className="tarjeta pila">
      <div>
        <h3>{NOMBRE_TIPO_REPORTE[reporte.tipo]}</h3>
        <p className="suave">
          {fechaLegible(reporte.creado)} · {persona(reporte.autor)} ·{' '}
          <span className={CLASE_ESTADO[reporte.estado]}>{NOMBRE_ESTADO_REPORTE[reporte.estado]}</span>
        </p>
      </div>

      <dl className="datos">
        {reporte.tipo !== 'tiradero' && (
          <>
            <dt>Lugar</dt>
            <dd>{nombreLugar(reporte.lugarId)}</dd>
          </>
        )}
        {reporte.fecha && (
          <>
            <dt>Día que no pasó</dt>
            <dd>{fechaCorta(reporte.fecha)}</dd>
          </>
        )}
        {reporte.incidenciaId !== null && (
          <>
            <dt>Incidencia</dt>
            <dd>
              {mismaIncidencia === 1
                ? 'Solo esta persona lo reportó.'
                : `${mismaIncidencia} personas reportaron el mismo lugar y fecha.`}
            </dd>
          </>
        )}
        {reporte.descripcion && (
          <>
            <dt>Descripción</dt>
            <dd>{reporte.descripcion}</dd>
          </>
        )}
      </dl>

      {reporte.punto && (
        <MapContainer
          center={[reporte.punto[1], reporte.punto[0]]}
          className="mapa mapa-reporte"
          scrollWheelZoom={false}
          zoom={16}
        >
          <TileLayer
            attribution={`<a href="https://www.openstreetmap.org/copyright">${ATRIBUCION_OSM}</a>`}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker center={[reporte.punto[1], reporte.punto[0]]} radius={10} />
        </MapContainer>
      )}

      {reporte.foto &&
        (foto === undefined ? (
          <p className="suave">Cargando foto…</p>
        ) : foto === null ? (
          <p className="aviso">No se pudo cargar la foto.</p>
        ) : (
          <img alt="Foto enviada con el reporte" className="foto-reporte" src={foto} />
        ))}

      <div>
        <h4>Historial</h4>
        <ol className="historial">
          {reporte.historial.map((e, i) => (
            <li key={i}>
              <strong>{NOMBRE_ESTADO_REPORTE[e.estado]}</strong> · <span className="suave">{fechaLegible(e.fecha)}</span>
              <br />
              {e.nota}
            </li>
          ))}
        </ol>
      </div>

      {siguientes.length > 0 ? (
        <form className="formulario" onSubmit={guardar}>
          <label>
            Nuevo estado
            <select onChange={(e) => setNuevo(e.target.value as EstadoReporte)} value={nuevo}>
              {siguientes.map((s) => (
                <option key={s} value={s}>
                  {NOMBRE_ESTADO_REPORTE[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nota para el vecino (la verá en la app)
            <textarea
              maxLength={LARGO_MAXIMO_NOTA}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej.: Lo estamos revisando con el equipo."
              required
              rows={3}
              value={nota}
            />
          </label>
          {error && (
            <p className="aviso" role="alert">
              {error}
            </p>
          )}
          <div className="acciones">
            <button className="boton" disabled={guardando} type="submit">
              {guardando ? 'Guardando…' : 'Cambiar estado'}
            </button>
          </div>
        </form>
      ) : (
        <p className="suave">Este reporte ya está cerrado.</p>
      )}
    </section>
  );
}
