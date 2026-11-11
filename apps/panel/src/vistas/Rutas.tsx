import {
  AVISO_POR_CONFIRMAR,
  coincide,
  DIAS_SEMANA,
  ETIQUETA_CONFIANZA,
  ETIQUETA_TIPO,
  etiquetaRuta,
  idLugar,
  listaDias,
  NOMBRE_DIA,
  notaExcepcion,
  VENTANAS,
  type Confianza,
  type Dia,
  type TipoLugar,
  type Turno,
} from '@carmen-limpio/compartido';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDatosPanel } from '../Acceso';
import { supabase } from '../supabase';

// Edición de lugares y horarios. La app descarga el catálogo en segundo plano y lo aplica al siguiente arranque.

interface FilaRuta {
  id: string;
  numero: number;
  turno: Turno;
}

interface FilaHorario {
  id: number;
  lugar_id: string;
  ruta_id: string;
  dias: Dia[];
  por_confirmar: boolean;
  confianza: Confianza;
  lugares: { nombre: string; tipo: TipoLugar } | null;
}

interface FilaLugarSimple {
  id: string;
  nombre: string;
}

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoLugar[];
const ordenar = (dias: readonly Dia[]) => DIAS_SEMANA.filter((d) => dias.includes(d));
const inicial = (d: Dia) => NOMBRE_DIA[d].slice(0, 2).replace(/^./, (l) => l.toUpperCase());

function SelectorDias({ dias, onCambiar }: { dias: readonly Dia[]; onCambiar: (dias: Dia[]) => void }) {
  return (
    <fieldset className="dias">
      <legend className="solo-lector">Días de recolección</legend>
      {DIAS_SEMANA.map((d) => (
        <label className="dia" key={d} title={NOMBRE_DIA[d]}>
          <input
            checked={dias.includes(d)}
            onChange={(e) => onCambiar(ordenar(e.target.checked ? [...dias, d] : dias.filter((x) => x !== d)))}
            type="checkbox"
          />
          <span aria-label={NOMBRE_DIA[d]}>{inicial(d)}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Rutas() {
  const { unidades, recargar } = useDatosPanel();
  const [rutas, setRutas] = useState<FilaRuta[]>();
  const [horarios, setHorarios] = useState<FilaHorario[]>([]);
  const [lugares, setLugares] = useState<FilaLugarSimple[]>([]);
  const [error, setError] = useState<string>();
  const [rutaId, setRutaId] = useState('M1');
  const [editando, setEditando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const [r, h, l] = await Promise.all([
      supabase.from('rutas').select('id, numero, turno').order('id'),
      supabase.from('horarios').select('id, lugar_id, ruta_id, dias, por_confirmar, confianza, lugares (nombre, tipo)'),
      supabase.from('lugares').select('id, nombre').order('nombre'),
    ]);
    const fallo = r.error ?? h.error ?? l.error;
    if (fallo) {
      setError(fallo.message);
      return;
    }
    setRutas(r.data as FilaRuta[]);
    setHorarios(h.data as unknown as FilaHorario[]);
    setLugares(l.data as FilaLugarSimple[]);
    setError(undefined);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Después de guardar: esta vista y el resto del panel (resumen, avisos) ven el mismo catálogo.
  const despuesDeGuardar = async () => {
    setEditando(null);
    await Promise.all([cargar(), recargar()]);
  };

  if (error) {
    return (
      <p className="aviso" role="alert">
        No se pudieron cargar las rutas: {error}
      </p>
    );
  }
  if (!rutas) return <p className="suave">Cargando rutas…</p>;

  const ruta = rutas.find((r) => r.id === rutaId) ?? rutas[0]!;
  const delaRuta = horarios
    .filter((h) => h.ruta_id === ruta.id)
    .sort((a, b) => (a.lugares?.nombre ?? '').localeCompare(b.lugares?.nombre ?? '', 'es'));
  const unidad = unidades.find((u) => u.matutina === ruta.id || u.vespertina === ruta.id);
  const ventana = VENTANAS[ruta.turno];
  const rutasPorLugar = (lugarId: string) => horarios.filter((h) => h.lugar_id === lugarId).length;

  return (
    <div className="pila">
      <h2>Rutas</h2>
      <p className="suave">
        Los cambios llegan a la app la siguiente vez que se abre con conexión. Los horarios vienen de carteles sin
        validación oficial.
      </p>
      <div className="maestro-detalle">
        <section className="tarjeta" aria-label="Lista de rutas">
          <ul className="lista-rutas">
            {rutas.map((r) => (
              <li key={r.id}>
                <button
                  aria-pressed={r.id === ruta.id}
                  className="fila-ruta"
                  onClick={() => {
                    setRutaId(r.id);
                    setEditando(null);
                  }}
                  type="button"
                >
                  <span>{etiquetaRuta(r)}</span>
                  <span>{horarios.filter((h) => h.ruta_id === r.id).length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta pila">
          <div>
            <h3>
              {ruta.id} · {etiquetaRuta(ruta)}
            </h3>
            <p className="suave">
              Ventana del turno {ruta.turno}: {ventana.inicio} a {ventana.fin} (igual para toda la ruta) ·{' '}
              {unidad ? `Unidad ${unidad.numero} (supuesto)` : 'Sin unidad asignada'}
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">Lugar</th>
                <th scope="col">Días</th>
                <th scope="col">Ubicación</th>
                <th scope="col">
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {delaRuta.map((h) =>
                editando === h.id ? (
                  <tr key={h.id}>
                    <td colSpan={4}>
                      <EditorHorario
                        horario={h}
                        onCancelar={() => setEditando(null)}
                        onGuardado={despuesDeGuardar}
                        ultimaRuta={rutasPorLugar(h.lugar_id) === 1}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={h.id}>
                    <td>{h.lugares?.nombre ?? h.lugar_id}</td>
                    <td>
                      {notaExcepcion(h.dias) ?? listaDias(h.dias)}
                      {h.por_confirmar && <p className="nota">{AVISO_POR_CONFIRMAR}</p>}
                    </td>
                    <td>{ETIQUETA_CONFIANZA[h.confianza]}</td>
                    <td>
                      <button className="boton boton-claro" onClick={() => setEditando(h.id)} type="button">
                        Editar
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          <AgregarLugar
            key={ruta.id}
            lugares={lugares.filter((l) => !delaRuta.some((h) => h.lugar_id === l.id))}
            onGuardado={despuesDeGuardar}
            ruta={ruta}
          />
        </section>
      </div>
    </div>
  );
}

function EditorHorario({
  horario,
  ultimaRuta,
  onGuardado,
  onCancelar,
}: {
  horario: FilaHorario;
  ultimaRuta: boolean;
  onGuardado: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [dias, setDias] = useState<Dia[]>(horario.dias);
  const [porConfirmar, setPorConfirmar] = useState(horario.por_confirmar);
  const [quitar, setQuitar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  const ejecutar = async (accion: () => PromiseLike<{ error: { message: string } | null }>) => {
    setGuardando(true);
    setError(undefined);
    const { error: fallo } = await accion();
    if (fallo) {
      setError(fallo.message);
      setGuardando(false);
      return;
    }
    await onGuardado();
  };

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (dias.length === 0) {
      setError('Elige al menos un día. Para sacar el lugar de esta ruta usa "Quitar de esta ruta".');
      return;
    }
    const cliente = supabase;
    ejecutar(() => cliente.from('horarios').update({ dias, por_confirmar: porConfirmar }).eq('id', horario.id));
  };

  const borrar = () => {
    if (!supabase) return;
    const cliente = supabase;
    ejecutar(() => cliente.from('horarios').delete().eq('id', horario.id));
  };

  return (
    <form className="formulario editor-horario" onSubmit={guardar}>
      <strong>{horario.lugares?.nombre ?? horario.lugar_id}</strong>
      <SelectorDias dias={dias} onCambiar={setDias} />
      <label className="casilla">
        <input checked={porConfirmar} onChange={(e) => setPorConfirmar(e.target.checked)} type="checkbox" />
        Días por confirmar (deducidos, no leídos del cartel)
      </label>
      {error && (
        <p className="aviso" role="alert">
          {error}
        </p>
      )}
      {quitar ? (
        <div className="pila">
          <p className="aviso">
            {ultimaRuta
              ? 'Es la única ruta de este lugar: dejará de aparecer en la búsqueda de la app.'
              : 'El lugar seguirá en sus otras rutas.'}
          </p>
          <div className="acciones">
            <button className="boton boton-peligro" disabled={guardando} onClick={borrar} type="button">
              Sí, quitar de esta ruta
            </button>
            <button className="boton boton-claro" disabled={guardando} onClick={() => setQuitar(false)} type="button">
              No
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones">
          <button className="boton" disabled={guardando} type="submit">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="boton boton-claro" disabled={guardando} onClick={onCancelar} type="button">
            Cancelar
          </button>
          <button className="boton boton-claro" disabled={guardando} onClick={() => setQuitar(true)} type="button">
            Quitar de esta ruta
          </button>
        </div>
      )}
    </form>
  );
}

function AgregarLugar({
  ruta,
  lugares,
  onGuardado,
}: {
  ruta: FilaRuta;
  lugares: FilaLugarSimple[];
  onGuardado: () => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [existente, setExistente] = useState<FilaLugarSimple | null>(null);
  const [tipo, setTipo] = useState<TipoLugar>('colonia');
  const [dias, setDias] = useState<Dia[]>([]);
  const [porConfirmar, setPorConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  const encontrados = useMemo(
    () => (busqueda.trim() && !existente ? lugares.filter((l) => coincide(l.nombre, busqueda)).slice(0, 6) : []),
    [busqueda, existente, lugares],
  );

  if (!abierto) {
    return (
      <div>
        <button className="boton boton-claro" onClick={() => setAbierto(true)} type="button">
          Agregar lugar a esta ruta
        </button>
      </div>
    );
  }

  const nombreNuevo = busqueda.trim();

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || guardando) return;
    if (!existente && nombreNuevo.length < 3) return setError('Escribe el nombre del lugar o elige uno de la lista.');
    if (dias.length === 0) return setError('Elige al menos un día.');
    setGuardando(true);
    setError(undefined);

    let lugarId = existente?.id;
    let creado = false;
    if (!lugarId) {
      lugarId = idLugar(nombreNuevo);
      // Sin ubicación: aparece en la búsqueda con su horario, pero sin mapa.
      const { error: fallo } = await supabase
        .from('lugares')
        .insert({ id: lugarId, nombre: nombreNuevo, tipo, confianza: 'ninguna' });
      if (fallo) {
        setError(fallo.code === '23505' ? 'Ya existe un lugar con ese nombre: búscalo en la lista.' : fallo.message);
        setGuardando(false);
        return;
      }
      creado = true;
    }

    const ventana = VENTANAS[ruta.turno];
    const { error: falloHorario } = await supabase.from('horarios').insert({
      lugar_id: lugarId,
      ruta_id: ruta.id,
      dias,
      inicio: ventana.inicio,
      fin: ventana.fin,
      confianza: 'ninguna',
      por_confirmar: porConfirmar,
    });
    if (falloHorario) {
      // Un lugar nuevo sin horario no sirve de nada: se deshace.
      if (creado) await supabase.from('lugares').delete().eq('id', lugarId);
      setError(falloHorario.message);
      setGuardando(false);
      return;
    }
    await onGuardado();
    setAbierto(false);
    setBusqueda('');
    setExistente(null);
    setDias([]);
    setPorConfirmar(false);
    setGuardando(false);
  };

  return (
    <form className="formulario tarjeta-interna" onSubmit={guardar}>
      <h4>Agregar lugar a {ruta.id}</h4>
      {existente ? (
        <p>
          <strong>{existente.nombre}</strong>{' '}
          <button className="boton boton-claro" onClick={() => setExistente(null)} type="button">
            Cambiar
          </button>
        </p>
      ) : (
        <>
          <label>
            Lugar
            <input
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca un lugar existente o escribe uno nuevo"
              value={busqueda}
            />
          </label>
          {encontrados.length > 0 && (
            <ul className="sugerencias">
              {encontrados.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setExistente(l)} type="button">
                    {l.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {nombreNuevo.length >= 3 && (
            <>
              <p className="suave">
                Si no está en la lista se creará “{nombreNuevo}” sin ubicación: aparecerá en la búsqueda con su horario,
                pero sin mapa.
              </p>
              <label>
                Tipo
                <select onChange={(e) => setTipo(e.target.value as TipoLugar)} value={tipo}>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETA_TIPO[t] ?? 'Otro'}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </>
      )}
      <SelectorDias dias={dias} onCambiar={setDias} />
      <label className="casilla">
        <input checked={porConfirmar} onChange={(e) => setPorConfirmar(e.target.checked)} type="checkbox" />
        Días por confirmar
      </label>
      {error && (
        <p className="aviso" role="alert">
          {error}
        </p>
      )}
      <div className="acciones">
        <button className="boton" disabled={guardando} type="submit">
          {guardando ? 'Guardando…' : 'Agregar'}
        </button>
        <button className="boton boton-claro" disabled={guardando} onClick={() => setAbierto(false)} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}
