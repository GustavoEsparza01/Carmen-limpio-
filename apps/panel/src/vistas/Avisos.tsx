import { BUCKET_IMAGENES_AVISOS, coincide, LUGARES, type TipoAviso } from '@carmen-limpio/compartido';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { aCampoMerida, desdeCampoMerida, fechaLegible } from '../fechas';
import { supabase } from '../supabase';

interface FilaAvisoPanel {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  desde: string;
  hasta: string | null;
  publicado: boolean;
  imagen: string | null;
  imagen_alt: string | null;
  avisos_lugares: { lugar_id: string }[];
}

interface Borrador {
  id: number | null;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  desde: string;
  hasta: string;
  publicado: boolean;
  lugares: string[];
  imagenActual: string | null;
  archivo: File | null;
  quitarImagen: boolean;
  imagenAlt: string;
}

const TIPOS: { valor: TipoAviso; nombre: string }[] = [
  { valor: 'horario', nombre: 'Cambio de horario' },
  { valor: 'servicio', nombre: 'Servicio suspendido o con retraso' },
  { valor: 'general', nombre: 'General' },
];
const NOMBRE_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.nombre])) as Record<TipoAviso, string>;

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const PESO_MAXIMO = 5 * 1024 * 1024;
const EXTENSION: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const CONSULTA = 'id, tipo, titulo, texto, desde, hasta, publicado, imagen, imagen_alt, avisos_lugares (lugar_id)';

function nuevoBorrador(): Borrador {
  return {
    id: null,
    tipo: 'general',
    titulo: '',
    texto: '',
    desde: aCampoMerida(new Date().toISOString()),
    hasta: '',
    publicado: false,
    lugares: [],
    imagenActual: null,
    archivo: null,
    quitarImagen: false,
    imagenAlt: '',
  };
}

function desdeFila(a: FilaAvisoPanel): Borrador {
  return {
    id: a.id,
    tipo: a.tipo,
    titulo: a.titulo,
    texto: a.texto,
    desde: aCampoMerida(a.desde),
    hasta: a.hasta ? aCampoMerida(a.hasta) : '',
    publicado: a.publicado,
    lugares: a.avisos_lugares.map((l) => l.lugar_id),
    imagenActual: a.imagen,
    archivo: null,
    quitarImagen: false,
    imagenAlt: a.imagen_alt ?? '',
  };
}

function estadoDe(a: FilaAvisoPanel, ahora: number): { texto: string; clase: string } {
  if (!a.publicado) return { texto: 'Borrador', clase: 'insignia' };
  if (a.hasta && Date.parse(a.hasta) <= ahora) return { texto: 'Vencido', clase: 'insignia' };
  if (Date.parse(a.desde) > ahora) return { texto: 'Programado', clase: 'insignia insignia-acento' };
  return { texto: 'Publicado', clase: 'insignia insignia-ok' };
}

const nombreLugar = (id: string) => LUGARES.find((l) => l.id === id)?.nombre ?? id;

function validar(b: Borrador): string | null {
  if (b.titulo.trim().length < 3) return 'El título necesita al menos 3 caracteres.';
  if (b.texto.trim().length < 3) return 'El texto necesita al menos 3 caracteres.';
  if (!b.desde) return 'Indica desde cuándo es visible.';
  if (b.hasta && desdeCampoMerida(b.hasta) <= desdeCampoMerida(b.desde)) return 'La fecha final debe ser posterior a la inicial.';
  const conImagen = b.archivo || (b.imagenActual && !b.quitarImagen);
  if (conImagen && b.imagenAlt.trim().length < 3) return 'Describe la imagen para quienes usan lector de pantalla.';
  if (b.archivo && !TIPOS_IMAGEN.includes(b.archivo.type)) return 'La imagen debe ser JPG, PNG o WebP.';
  if (b.archivo && b.archivo.size > PESO_MAXIMO) return 'La imagen pesa más de 5 MB.';
  return null;
}

export function Avisos() {
  const [avisos, setAvisos] = useState<FilaAvisoPanel[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [porBorrar, setPorBorrar] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fallo } = await supabase.from('avisos').select(CONSULTA).order('desde', { ascending: false });
    if (fallo) return setError(fallo.message);
    const filas = (data ?? []) as FilaAvisoPanel[];
    setAvisos(filas);
    const rutas = filas.map((a) => a.imagen).filter((r): r is string => Boolean(r));
    if (rutas.length === 0) return setUrls({});
    const { data: firmadas } = await supabase.storage.from(BUCKET_IMAGENES_AVISOS).createSignedUrls(rutas, 3600);
    setUrls(Object.fromEntries((firmadas ?? []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarPublicado = async (a: FilaAvisoPanel) => {
    if (!supabase) return;
    const { error: fallo } = await supabase.from('avisos').update({ publicado: !a.publicado }).eq('id', a.id);
    if (fallo) return setError(fallo.message);
    await cargar();
  };

  const borrar = async (a: FilaAvisoPanel) => {
    if (!supabase) return;
    const { error: fallo } = await supabase.from('avisos').delete().eq('id', a.id);
    if (fallo) return setError(fallo.message);
    if (a.imagen) await supabase.storage.from(BUCKET_IMAGENES_AVISOS).remove([a.imagen]);
    setPorBorrar(null);
    await cargar();
  };

  if (borrador) {
    return (
      <FormularioAviso
        borrador={borrador}
        imagenActualUrl={borrador.imagenActual ? urls[borrador.imagenActual] : undefined}
        onCancelar={() => setBorrador(null)}
        onGuardado={async () => {
          setBorrador(null);
          await cargar();
        }}
      />
    );
  }

  const ahora = Date.now();

  return (
    <div className="pila">
      <div className="titulo-accion">
        <h2>Avisos</h2>
        <button className="boton" onClick={() => setBorrador(nuevoBorrador())} type="button">
          Nuevo aviso
        </button>
      </div>
      <p className="aviso">
        Los avisos publicados aparecen en la app para cualquier persona, con su imagen. Los publica el equipo del
        proyecto: no los presentes como comunicados del municipio ni de la empresa recolectora.
      </p>
      {error && (
        <p className="aviso" role="alert">
          {error}
        </p>
      )}
      {!avisos && <p>Cargando avisos…</p>}
      {avisos?.length === 0 && <p className="suave">Todavía no hay avisos.</p>}
      {avisos?.map((a) => {
        const estado = estadoDe(a, ahora);
        return (
          <article className="tarjeta aviso-fila" key={a.id}>
            {a.imagen && (
              <img alt={a.imagen_alt ?? ''} className="aviso-miniatura" src={urls[a.imagen]} />
            )}
            <div className="aviso-cuerpo">
              <div className="aviso-encabezado">
                <span className={estado.clase}>{estado.texto}</span>
                <span className="suave">{NOMBRE_TIPO[a.tipo]}</span>
              </div>
              <h3>{a.titulo}</h3>
              <p className="aviso-texto">{a.texto}</p>
              <p className="suave">
                Desde {fechaLegible(a.desde)}
                {a.hasta ? ` hasta ${fechaLegible(a.hasta)}` : ', sin fecha final'} ·{' '}
                {a.avisos_lugares.length === 0
                  ? 'Toda la ciudad'
                  : a.avisos_lugares.map((l) => nombreLugar(l.lugar_id)).join(', ')}
              </p>
              <div className="acciones">
                <button className="boton boton-claro" onClick={() => setBorrador(desdeFila(a))} type="button">
                  Editar
                </button>
                <button className="boton boton-claro" onClick={() => cambiarPublicado(a)} type="button">
                  {a.publicado ? 'Despublicar' : 'Publicar'}
                </button>
                {porBorrar === a.id ? (
                  <>
                    <button className="boton boton-peligro" onClick={() => borrar(a)} type="button">
                      Sí, eliminar
                    </button>
                    <button className="boton boton-claro" onClick={() => setPorBorrar(null)} type="button">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button className="boton boton-claro" onClick={() => setPorBorrar(a.id)} type="button">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function FormularioAviso({
  borrador: inicial,
  imagenActualUrl,
  onCancelar,
  onGuardado,
}: {
  borrador: Borrador;
  imagenActualUrl?: string;
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const [b, setB] = useState(inicial);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiar = (campos: Partial<Borrador>) => {
    setError(null);
    setB((actual) => ({ ...actual, ...campos }));
  };

  const vistaPrevia = useMemo(() => (b.archivo ? URL.createObjectURL(b.archivo) : null), [b.archivo]);
  useEffect(() => () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
  }, [vistaPrevia]);

  const encontrados = busqueda.trim()
    ? LUGARES.filter((l) => coincide(l.nombre, busqueda) && !b.lugares.includes(l.id)).slice(0, 8)
    : [];
  const imagenVisible = vistaPrevia ?? (b.imagenActual && !b.quitarImagen ? imagenActualUrl : undefined);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || guardando) return;
    const problema = validar(b);
    if (problema) return setError(problema);
    setGuardando(true);
    setError(null);
    let subida: string | null = null;
    try {
      if (b.archivo) {
        subida = `${crypto.randomUUID()}.${EXTENSION[b.archivo.type]}`;
        const { error: fallo } = await supabase.storage
          .from(BUCKET_IMAGENES_AVISOS)
          .upload(subida, b.archivo, { contentType: b.archivo.type });
        if (fallo) throw fallo;
      }
      const imagen = subida ?? (b.quitarImagen ? null : b.imagenActual);
      const fila = {
        tipo: b.tipo,
        titulo: b.titulo.trim(),
        texto: b.texto.trim(),
        desde: desdeCampoMerida(b.desde),
        hasta: b.hasta ? desdeCampoMerida(b.hasta) : null,
        publicado: b.publicado,
        imagen,
        imagen_alt: imagen ? b.imagenAlt.trim() : null,
      };
      const consulta = b.id
        ? supabase.from('avisos').update(fila).eq('id', b.id).select('id').single()
        : supabase.from('avisos').insert(fila).select('id').single();
      const { data, error: fallo } = await consulta;
      if (fallo) throw fallo;
      const id = (data as { id: number }).id;

      const { error: falloBorrar } = await supabase.from('avisos_lugares').delete().eq('aviso_id', id);
      if (falloBorrar) throw falloBorrar;
      if (b.lugares.length > 0) {
        const { error: falloLugares } = await supabase
          .from('avisos_lugares')
          .insert(b.lugares.map((lugar_id) => ({ aviso_id: id, lugar_id })));
        if (falloLugares) throw falloLugares;
      }
      // La imagen anterior ya no la usa nadie: se borra después de guardar, no antes.
      if (b.imagenActual && b.imagenActual !== imagen) {
        await supabase.storage.from(BUCKET_IMAGENES_AVISOS).remove([b.imagenActual]);
      }
      onGuardado();
    } catch (e) {
      // Si falló el aviso, la imagen recién subida queda huérfana: se borra.
      if (subida) await supabase.storage.from(BUCKET_IMAGENES_AVISOS).remove([subida]);
      setError(e instanceof Error ? e.message : 'No se pudo guardar el aviso.');
      setGuardando(false);
    }
  };

  return (
    <div className="pila">
      <h2>{b.id ? 'Editar aviso' : 'Nuevo aviso'}</h2>
      <form className="tarjeta formulario formulario-aviso" onSubmit={guardar}>
        <label>
          Tipo
          <select onChange={(e) => cambiar({ tipo: e.target.value as TipoAviso })} value={b.tipo}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Título
          <input maxLength={120} onChange={(e) => cambiar({ titulo: e.target.value })} required value={b.titulo} />
        </label>
        <label>
          Texto
          <textarea maxLength={2000} onChange={(e) => cambiar({ texto: e.target.value })} required rows={5} value={b.texto} />
        </label>

        <div className="columnas">
          <label>
            Visible desde (hora de Ciudad del Carmen)
            <input onChange={(e) => cambiar({ desde: e.target.value })} required type="datetime-local" value={b.desde} />
          </label>
          <label>
            Hasta (opcional)
            <input onChange={(e) => cambiar({ hasta: e.target.value })} type="datetime-local" value={b.hasta} />
          </label>
        </div>

        <fieldset>
          <legend>Lugares afectados</legend>
          <p className="suave">Si no eliges ninguno, el aviso es para toda la ciudad.</p>
          <div className="chips">
            {b.lugares.map((id) => (
              <button
                aria-label={`Quitar ${nombreLugar(id)}`}
                className="chip"
                key={id}
                onClick={() => cambiar({ lugares: b.lugares.filter((l) => l !== id) })}
                type="button"
              >
                {nombreLugar(id)} ×
              </button>
            ))}
          </div>
          <input
            aria-label="Buscar lugar"
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca una colonia para agregarla"
            value={busqueda}
          />
          {encontrados.length > 0 && (
            <ul className="sugerencias">
              {encontrados.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => {
                      cambiar({ lugares: [...b.lugares, l.id] });
                      setBusqueda('');
                    }}
                    type="button"
                  >
                    {l.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset>
          <legend>Imagen (opcional)</legend>
          <p className="suave">JPG, PNG o WebP de hasta 5 MB. Se mostrará completa, sin recortar.</p>
          {imagenVisible && <img alt="" className="aviso-vista-previa" src={imagenVisible} />}
          <input
            accept={TIPOS_IMAGEN.join(',')}
            aria-label="Elegir imagen"
            // Una imagen nueva necesita su propia descripción: la anterior describiría otra cosa.
            onChange={(e) => cambiar({ archivo: e.target.files?.[0] ?? null, quitarImagen: false, imagenAlt: '' })}
            type="file"
          />
          {(b.archivo || (b.imagenActual && !b.quitarImagen)) && (
            <>
              <label>
                Descripción de la imagen
                <input
                  maxLength={300}
                  onChange={(e) => cambiar({ imagenAlt: e.target.value })}
                  placeholder="Ej.: Cartel con el nuevo horario de la Ruta 3"
                  value={b.imagenAlt}
                />
              </label>
              <button
                className="boton boton-claro"
                onClick={() => cambiar({ archivo: null, quitarImagen: true })}
                type="button"
              >
                Quitar imagen
              </button>
            </>
          )}
        </fieldset>

        <label className="casilla">
          <input checked={b.publicado} onChange={(e) => cambiar({ publicado: e.target.checked })} type="checkbox" />
          Publicar en la app
        </label>

        {error && (
          <p className="aviso" role="alert">
            {error}
          </p>
        )}
        <div className="acciones">
          <button className="boton" disabled={guardando} type="submit">
            {guardando ? 'Guardando…' : 'Guardar aviso'}
          </button>
          <button className="boton boton-claro" disabled={guardando} onClick={onCancelar} type="button">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
