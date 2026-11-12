import {
  CONSULTA_LUGARES,
  CONSULTA_UNIDADES,
  lugaresDesdeFilas,
  reemplazarCatalogo,
  unidadesDesdeFilas,
  type FilaLugar,
  type FilaUnidad,
  type UnidadRemota,
} from '@carmen-limpio/compartido';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { hoyMerida, supabase } from './supabase';

interface DatosPanel {
  correo: string;
  unidades: UnidadRemota[];
  salir: () => void;
  // Vuelve a leer catálogo y unidades después de editarlos, sin perder la vista actual.
  recargar: () => Promise<void>;
}

const Contexto = createContext<DatosPanel | null>(null);

export function useDatosPanel(): DatosPanel {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useDatosPanel debe usarse dentro de Acceso');
  return valor;
}

type Estado =
  | { tipo: 'revisando' }
  | { tipo: 'sinSesion' }
  | { tipo: 'sinPermiso'; correo: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; correo: string; unidades: UnidadRemota[] };

// El rol se comprueba en la base (es_admin y la RLS). Esta pantalla solo evita mostrar un panel vacío.
async function cargar(sesion: Session): Promise<Estado> {
  if (!supabase) throw new Error('Sin configuración');
  const correo = sesion.user.email ?? 'Sin correo';
  const { data: admin, error: errorRol } = await supabase.rpc('es_admin');
  if (errorRol) throw errorRol;
  if (!admin) return { tipo: 'sinPermiso', correo };

  const [lugares, unidades] = await Promise.all([
    supabase.from('lugares').select(CONSULTA_LUGARES),
    supabase.from('unidades').select(CONSULTA_UNIDADES),
  ]);
  if (lugares.error) throw lugares.error;
  if (unidades.error) throw unidades.error;
  reemplazarCatalogo(lugaresDesdeFilas(lugares.data as unknown as FilaLugar[]));
  return {
    tipo: 'listo',
    correo,
    unidades: unidadesDesdeFilas(unidades.data as unknown as FilaUnidad[], hoyMerida()),
  };
}

export function Acceso({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'revisando' });

  useEffect(() => {
    if (!supabase) return;
    // Supabase repite SIGNED_IN al volver a la pestaña. Recargar ahí borraría un aviso a medio escribir,
    // así que solo se recarga cuando cambia la persona.
    let usuarioActual: string | null | undefined;
    const alCambiar = (sesion: Session | null) => {
      const usuario = sesion?.user.id ?? null;
      if (usuario === usuarioActual) return;
      usuarioActual = usuario;
      if (!sesion) return setEstado({ tipo: 'sinSesion' });
      setEstado({ tipo: 'revisando' });
      cargar(sesion)
        .then(setEstado)
        .catch((e: unknown) =>
          setEstado({ tipo: 'error', mensaje: e instanceof Error ? e.message : 'Error desconocido' }),
        );
    };
    supabase.auth.getSession().then(({ data }) => alCambiar(data.session));
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') alCambiar(sesion);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const recargar = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) setEstado(await cargar(data.session));
  };

  const salir = () => {
    supabase?.auth.signOut();
  };

  if (!supabase) {
    return (
      <Pantalla titulo="Falta configurar Supabase">
        <p className="suave">
          Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code> de
          la raíz y reinicia <code>npm run panel</code>.
        </p>
      </Pantalla>
    );
  }

  switch (estado.tipo) {
    case 'revisando':
      return <Pantalla titulo="Cargando…" />;
    case 'sinSesion':
      return <FormularioEntrada />;
    case 'sinPermiso':
      return (
        <Pantalla titulo="Esta cuenta no administra el panel">
          <p className="suave">
            Entraste como {estado.correo}, que es una cuenta ciudadana. El rol de administración se asigna desde la base
            de datos.
          </p>
          <button className="boton" onClick={salir} type="button">
            Salir
          </button>
        </Pantalla>
      );
    case 'error':
      return (
        <Pantalla titulo="No se pudieron cargar los datos">
          <p className="suave">{estado.mensaje}</p>
          <button className="boton" onClick={() => window.location.reload()} type="button">
            Reintentar
          </button>
        </Pantalla>
      );
    case 'listo':
      return (
        <Contexto.Provider value={{ correo: estado.correo, unidades: estado.unidades, salir, recargar }}>
          {children}
        </Contexto.Provider>
      );
  }
}

function Pantalla({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <main className="acceso">
      <section className="tarjeta acceso-tarjeta">
        <h1>Carmen Limpio</h1>
        <h2>{titulo}</h2>
        {children}
      </section>
    </main>
  );
}

function FormularioEntrada() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setEnviando(true);
    setError(null);
    const { error: fallo } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    setEnviando(false);
    if (fallo) setError(fallo.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : fallo.message);
  };

  return (
    <Pantalla titulo="Panel administrativo">
      <form className="formulario" onSubmit={entrar}>
        <label>
          Correo
          <input autoComplete="username" onChange={(e) => setCorreo(e.target.value)} required type="email" value={correo} />
        </label>
        <label>
          Contraseña
          <input
            autoComplete="current-password"
            onChange={(e) => setClave(e.target.value)}
            required
            type="password"
            value={clave}
          />
        </label>
        {error && (
          <p className="aviso" role="alert">
            {error}
          </p>
        )}
        <button className="boton" disabled={enviando} type="submit">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="suave">Solo para el equipo del proyecto. No es un sistema oficial.</p>
    </Pantalla>
  );
}
