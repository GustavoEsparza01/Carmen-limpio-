import { diaAnterior, etiquetaRuta, planAsignacion, type Turno } from '@carmen-limpio/compartido';
import { useCallback, useEffect, useState } from 'react';
import { useDatosPanel } from '../Acceso';
import { fechaCorta } from '../fechas';
import { hoyMerida, supabase } from '../supabase';

type EstadoUnidad = 'activa' | 'taller' | 'baja';

interface FilaUnidad {
  numero: number;
  placas: string | null;
  estado: EstadoUnidad;
  nota: string | null;
}

interface FilaAsignacion {
  id: number;
  unidad: number;
  ruta_id: string;
  desde: string;
  hasta: string | null;
}

interface FilaRuta {
  id: string;
  numero: number;
  turno: Turno;
}

const ESTADOS: { valor: EstadoUnidad; nombre: string }[] = [
  { valor: 'activa', nombre: 'Activa' },
  { valor: 'taller', nombre: 'En taller' },
  { valor: 'baja', nombre: 'Baja' },
];

const vigente = (a: FilaAsignacion, hoy: string) => a.desde <= hoy && (a.hasta === null || a.hasta >= hoy);

export function Unidades() {
  const { recargar } = useDatosPanel();
  const [unidades, setUnidades] = useState<FilaUnidad[]>();
  const [asignaciones, setAsignaciones] = useState<FilaAsignacion[]>([]);
  const [rutas, setRutas] = useState<FilaRuta[]>([]);
  const [error, setError] = useState<string>();
  const hoy = hoyMerida();

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const [u, a, r] = await Promise.all([
      supabase.from('unidades').select('numero, placas, estado, nota').order('numero'),
      supabase.from('asignaciones').select('id, unidad, ruta_id, desde, hasta'),
      supabase.from('rutas').select('id, numero, turno').order('id'),
    ]);
    const fallo = u.error ?? a.error ?? r.error;
    if (fallo) {
      setError(fallo.message);
      return;
    }
    setUnidades(u.data as FilaUnidad[]);
    setAsignaciones(a.data as FilaAsignacion[]);
    setRutas(r.data as FilaRuta[]);
    setError(undefined);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const despuesDeGuardar = async () => {
    await Promise.all([cargar(), recargar()]);
  };

  if (error) {
    return (
      <p className="aviso" role="alert">
        No se pudieron cargar las unidades: {error}
      </p>
    );
  }
  if (!unidades) return <p className="suave">Cargando unidades…</p>;

  const vigentes = asignaciones.filter((a) => vigente(a, hoy));
  const turnoDe = (rutaId: string) => rutas.find((r) => r.id === rutaId)?.turno;

  return (
    <div className="pila">
      <h2>Unidades y asignaciones</h2>
      <p className="aviso">
        Supuesto pendiente de confirmar: un mismo vehículo cubre ambos turnos. Placas y estados son ilustrativos mientras
        no haya datos reales.
      </p>

      <section className="tarjeta pila">
        <h3>Unidades</h3>
        <table>
          <thead>
            <tr>
              <th scope="col">Unidad</th>
              <th scope="col">Rutas hoy</th>
              <th scope="col">Placas</th>
              <th scope="col">Estado</th>
              <th scope="col">Nota</th>
              <th scope="col">
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) => (
              <FilaEditableUnidad
                key={`${u.numero}-${u.placas}-${u.estado}-${u.nota}`}
                onGuardado={despuesDeGuardar}
                rutasHoy={vigentes
                  .filter((a) => a.unidad === u.numero)
                  .map((a) => a.ruta_id)
                  .sort()}
                unidad={u}
              />
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta pila">
        <h3>Qué unidad cubre cada ruta</h3>
        <p className="suave">
          Al cambiar la unidad, la asignación anterior se cierra ayer y la nueva empieza hoy ({fechaCorta(hoy)}), para
          conservar el historial. Una unidad cubre una sola ruta por turno.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Ruta</th>
              <th scope="col">Unidad</th>
              <th scope="col">Desde</th>
              <th scope="col">
                <span className="solo-lector">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rutas.map((r) => {
              const actual = vigentes.find((a) => a.ruta_id === r.id) ?? null;
              return (
                <FilaAsignacionRuta
                  actual={actual}
                  hoy={hoy}
                  key={`${r.id}-${actual?.id}-${actual?.unidad}`}
                  onGuardado={despuesDeGuardar}
                  ocupadas={
                    new Map(
                      vigentes
                        .filter((a) => a.ruta_id !== r.id && turnoDe(a.ruta_id) === r.turno)
                        .map((a) => [a.unidad, a.ruta_id]),
                    )
                  }
                  ruta={r}
                  unidades={unidades}
                />
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FilaEditableUnidad({
  unidad,
  rutasHoy,
  onGuardado,
}: {
  unidad: FilaUnidad;
  rutasHoy: string[];
  onGuardado: () => Promise<void>;
}) {
  const [placas, setPlacas] = useState(unidad.placas ?? '');
  const [estado, setEstado] = useState(unidad.estado);
  const [nota, setNota] = useState(unidad.nota ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const cambio = placas !== (unidad.placas ?? '') || estado !== unidad.estado || nota !== (unidad.nota ?? '');

  const guardar = async () => {
    if (!supabase) return;
    setGuardando(true);
    setError(undefined);
    const { error: fallo } = await supabase
      .from('unidades')
      .update({ placas: placas.trim() || null, estado, nota: nota.trim() || null })
      .eq('numero', unidad.numero);
    if (fallo) {
      setError(fallo.message);
      setGuardando(false);
      return;
    }
    await onGuardado();
  };

  return (
    <tr>
      <td>Unidad {unidad.numero}</td>
      <td>{rutasHoy.join(', ') || 'Sin ruta'}</td>
      <td>
        <input
          aria-label={`Placas de la unidad ${unidad.numero}`}
          className="campo-tabla"
          maxLength={12}
          onChange={(e) => setPlacas(e.target.value.toUpperCase())}
          placeholder="Pendiente"
          value={placas}
        />
      </td>
      <td>
        <select
          aria-label={`Estado de la unidad ${unidad.numero}`}
          onChange={(e) => setEstado(e.target.value as EstadoUnidad)}
          value={estado}
        >
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.nombre}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          aria-label={`Nota de la unidad ${unidad.numero}`}
          className="campo-tabla"
          maxLength={200}
          onChange={(e) => setNota(e.target.value)}
          value={nota}
        />
        {error && (
          <p className="aviso" role="alert">
            {error}
          </p>
        )}
      </td>
      <td>
        <button className="boton boton-claro" disabled={!cambio || guardando} onClick={guardar} type="button">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

function FilaAsignacionRuta({
  ruta,
  actual,
  unidades,
  ocupadas,
  hoy,
  onGuardado,
}: {
  ruta: FilaRuta;
  actual: FilaAsignacion | null;
  unidades: FilaUnidad[];
  // Unidad → ruta que ya cubre en este turno.
  ocupadas: Map<number, string>;
  hoy: string;
  onGuardado: () => Promise<void>;
}) {
  const [elegida, setElegida] = useState<string>(actual ? String(actual.unidad) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const cambio = elegida !== (actual ? String(actual.unidad) : '');

  const guardar = async () => {
    if (!supabase) return;
    const cliente = supabase;
    setError(undefined);
    const nueva = elegida ? Number(elegida) : null;
    if (nueva !== null && ocupadas.has(nueva)) {
      setError(`La unidad ${nueva} ya cubre ${ocupadas.get(nueva)} en este turno. Cámbiala primero.`);
      return;
    }
    setGuardando(true);
    const pasos: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (nueva === null) {
      // Sin unidad: se cierra la vigente, o se borra si empezó hoy.
      if (actual) {
        pasos.push(
          actual.desde >= hoy
            ? cliente.from('asignaciones').delete().eq('id', actual.id)
            : cliente.from('asignaciones').update({ hasta: diaAnterior(hoy) }).eq('id', actual.id),
        );
      }
    } else {
      const plan = planAsignacion(actual, nueva, hoy);
      if (plan.tipo === 'corregir') {
        pasos.push(cliente.from('asignaciones').update({ unidad: nueva }).eq('id', plan.id));
      } else if (plan.tipo === 'relevar') {
        // Primero se cierra la anterior: la base no permite dos unidades a la vez en una ruta.
        if (plan.cerrarId !== null) {
          const { error: fallo } = await cliente.from('asignaciones').update({ hasta: plan.hasta }).eq('id', plan.cerrarId);
          if (fallo) {
            setError(fallo.message);
            setGuardando(false);
            return;
          }
        }
        pasos.push(cliente.from('asignaciones').insert({ unidad: nueva, ruta_id: ruta.id, desde: hoy }));
      }
    }
    for (const paso of pasos) {
      const { error: fallo } = await paso;
      if (fallo) {
        setError(fallo.message);
        setGuardando(false);
        return;
      }
    }
    await onGuardado();
  };

  return (
    <tr>
      <td>
        {ruta.id} · {etiquetaRuta(ruta)}
      </td>
      <td>
        <select aria-label={`Unidad de la ruta ${ruta.id}`} onChange={(e) => setElegida(e.target.value)} value={elegida}>
          <option value="">Sin unidad</option>
          {unidades.map((u) => (
            <option key={u.numero} value={u.numero}>
              Unidad {u.numero}
              {ocupadas.has(u.numero) ? ` (cubre ${ocupadas.get(u.numero)})` : ''}
              {u.estado !== 'activa' ? ` · ${u.estado === 'taller' ? 'en taller' : 'baja'}` : ''}
            </option>
          ))}
        </select>
        {error && (
          <p className="aviso" role="alert">
            {error}
          </p>
        )}
      </td>
      <td>{actual ? fechaCorta(actual.desde) : '—'}</td>
      <td>
        <button className="boton boton-claro" disabled={!cambio || guardando} onClick={guardar} type="button">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}
