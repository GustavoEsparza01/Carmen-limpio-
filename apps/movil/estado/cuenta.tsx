import {
  BUCKET_FOTOS_REPORTES,
  CONFIRMACION_CORREO,
  CONSULTA_REPORTES,
  filaNuevoReporte,
  NUEVA_CLAVE,
  mensajeError,
  reportesDesdeFilas,
  VERSION_AVISO_PRIVACIDAD,
  type BorradorReporte,
  type FilaReporte,
  type Reporte,
} from '@carmen-limpio/compartido';
import { File } from 'expo-file-system';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { borrarFoto } from './fotos';
import { conLimite, supabase } from './supabase';

// Cuenta del vecino y sus reportes en Supabase. Consultar horarios no necesita nada de esto.

const PESO_MAXIMO_FOTO = 5 * 1024 * 1024;
// Subir una foto con mala señal tarda más que una consulta.
const LIMITE_SUBIDA_MS = 60_000;

class ErrorSupabase extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

// Un mensaje ya escrito para el vecino: se muestra tal cual.
class MensajeVecino extends Error {}

export function textoError(error: unknown): string {
  if (error instanceof MensajeVecino) return error.message;
  return mensajeError(error instanceof Error ? (error as ErrorSupabase) : null);
}

// supabase-js devuelve { error } en lugar de lanzar: así cada pantalla usa try/catch y mensajeError.
function revisar<T extends { error: { message: string; code?: string } | null }>(respuesta: T): T {
  if (respuesta.error) throw new ErrorSupabase(respuesta.error.message, respuesta.error.code);
  return respuesta;
}

function cliente() {
  if (!supabase) throw new MensajeVecino('Los reportes no están disponibles en esta versión de la app.');
  return supabase;
}

interface Usuario {
  id: string;
  correo: string;
}

interface EstadoCuenta {
  // Sin Supabase configurado no hay cuentas ni reportes.
  disponible: boolean;
  cargado: boolean;
  usuario: Usuario | null;
  // Aceptó la versión vigente del aviso de privacidad. null mientras se consulta.
  privacidadVigente: boolean | null;
  reportes: Reporte[];
  cargandoReportes: boolean;
  errorReportes: boolean;
  registrar: (correo: string, clave: string) => Promise<{ confirmarCorreo: boolean }>;
  entrar: (correo: string, clave: string) => Promise<void>;
  recuperarClave: (correo: string) => Promise<void>;
  salir: () => Promise<void>;
  aceptarPrivacidad: () => Promise<void>;
  recargar: () => Promise<void>;
  crear: (borrador: BorradorReporte) => Promise<string>;
  fotoFirmada: (ruta: string) => Promise<string | null>;
  eliminarCuenta: () => Promise<void>;
}

const Contexto = createContext<EstadoCuenta | null>(null);

export function ProveedorCuenta({ children }: { children: ReactNode }) {
  const [cargado, setCargado] = useState(!supabase);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [privacidadVigente, setPrivacidadVigente] = useState<boolean | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [errorReportes, setErrorReportes] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const aUsuario = (u: { id: string; email?: string } | null | undefined) =>
      u ? { id: u.id, correo: u.email ?? '' } : null;
    supabase.auth
      .getSession()
      .then(({ data }) => setUsuario(aUsuario(data.session?.user)))
      .catch(() => {})
      .finally(() => setCargado(true));
    // No se consulta nada dentro de este callback: supabase-js lo desaconseja.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setUsuario((actual) => {
        const nuevo = aUsuario(sesion?.user);
        return actual?.id === nuevo?.id ? actual : nuevo;
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const cargarPerfil = useCallback(async (id: string) => {
    const { data } = revisar(
      await conLimite(cliente().from('perfiles').select('privacidad_version').eq('id', id).maybeSingle()),
    );
    setPrivacidadVigente(data?.privacidad_version === VERSION_AVISO_PRIVACIDAD);
  }, []);

  const recargar = useCallback(async () => {
    if (!supabase || !usuario) return;
    setCargandoReportes(true);
    try {
      const { data } = revisar(
        await conLimite(supabase.from('reportes_detalle').select(CONSULTA_REPORTES).order('creado', { ascending: false })),
      );
      setReportes(reportesDesdeFilas((data ?? []) as unknown as FilaReporte[]));
      setErrorReportes(false);
    } catch {
      setErrorReportes(true);
    } finally {
      setCargandoReportes(false);
    }
  }, [usuario]);

  useEffect(() => {
    setReportes([]);
    setErrorReportes(false);
    setPrivacidadVigente(null);
    if (!usuario) return;
    cargarPerfil(usuario.id).catch(() => setPrivacidadVigente(null));
    recargar();
  }, [usuario, cargarPerfil, recargar]);

  const aceptarPrivacidad = async () => {
    revisar(await conLimite(cliente().rpc('aceptar_privacidad', { p_version: VERSION_AVISO_PRIVACIDAD })));
    setPrivacidadVigente(true);
  };

  const registrar = async (correo: string, clave: string) => {
    const { data } = revisar(
      await conLimite(
        cliente().auth.signUp({
          email: correo.trim(),
          password: clave,
          // Sin esto, el enlace del correo regresa a la Site URL de Supabase.
          options: { emailRedirectTo: CONFIRMACION_CORREO },
        }),
      ),
    );
    // Con la confirmación de correo activa no hay sesión hasta abrir el enlace.
    if (!data.session) return { confirmarCorreo: true };
    // Quien se registra ya leyó y aceptó el aviso en la pantalla anterior.
    await aceptarPrivacidad();
    return { confirmarCorreo: false };
  };

  const entrar = async (correo: string, clave: string) => {
    revisar(await conLimite(cliente().auth.signInWithPassword({ email: correo.trim(), password: clave })));
  };

  // Supabase responde igual exista o no la cuenta: así no revela qué correos están registrados.
  const recuperarClave = async (correo: string) => {
    revisar(await conLimite(cliente().auth.resetPasswordForEmail(correo.trim(), { redirectTo: NUEVA_CLAVE })));
  };

  const salir = async () => {
    await cliente().auth.signOut();
  };

  const subirFoto = async (uri: string, autor: string) => {
    const datos = await new File(uri).arrayBuffer();
    if (datos.byteLength > PESO_MAXIMO_FOTO) throw new MensajeVecino('La foto pesa más de 5 MB. Elige otra o toma una nueva.');
    const ruta = `${autor}/${Date.now()}.jpg`;
    revisar(
      await conLimite(
        cliente().storage.from(BUCKET_FOTOS_REPORTES).upload(ruta, datos, { contentType: 'image/jpeg' }),
        LIMITE_SUBIDA_MS,
      ),
    );
    return ruta;
  };

  const crear = async (borrador: BorradorReporte) => {
    if (!usuario) throw new MensajeVecino('Inicia sesión para reportar.');
    const conFoto = borrador.tipo !== 'noPaso' && borrador.fotoUri;
    const foto = conFoto ? await subirFoto(borrador.fotoUri!, usuario.id) : null;
    try {
      const { data } = revisar(
        await conLimite(cliente().from('reportes').insert(filaNuevoReporte(borrador, foto)).select('id').single()),
      );
      // Ya está en Supabase: la copia del teléfono sobra.
      if (borrador.fotoUri) borrarFoto(borrador.fotoUri);
      await recargar();
      return (data as { id: string }).id;
    } catch (error) {
      // Una foto sin reporte no debe quedarse en el bucket.
      if (foto) await cliente().storage.from(BUCKET_FOTOS_REPORTES).remove([foto]).catch(() => {});
      throw error;
    }
  };

  const fotoFirmada = useCallback(async (ruta: string) => {
    if (!supabase) return null;
    const { data } = await conLimite(supabase.storage.from(BUCKET_FOTOS_REPORTES).createSignedUrl(ruta, 3600)).catch(
      () => ({ data: null }),
    );
    return data?.signedUrl ?? null;
  }, []);

  const eliminarCuenta = async () => {
    if (!usuario) return;
    const fotos = cliente().storage.from(BUCKET_FOTOS_REPORTES);
    // Primero las fotos: la base no puede borrarlas por su cuenta.
    const { data } = revisar(await conLimite(fotos.list(usuario.id, { limit: 1000 })));
    const rutas = (data ?? []).map((f) => `${usuario.id}/${f.name}`);
    if (rutas.length > 0) revisar(await conLimite(fotos.remove(rutas)));
    revisar(await conLimite(cliente().rpc('eliminar_mi_cuenta')));
    // La cuenta ya no existe: solo falta olvidar la sesión en este teléfono.
    await cliente().auth.signOut({ scope: 'local' });
  };

  const valor: EstadoCuenta = {
    aceptarPrivacidad,
    cargado,
    cargandoReportes,
    crear,
    disponible: supabase !== null,
    eliminarCuenta,
    entrar,
    errorReportes,
    fotoFirmada,
    privacidadVigente,
    recargar,
    recuperarClave,
    registrar,
    reportes,
    salir,
    usuario,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCuenta() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useCuenta debe usarse dentro de ProveedorCuenta');
  return valor;
}
