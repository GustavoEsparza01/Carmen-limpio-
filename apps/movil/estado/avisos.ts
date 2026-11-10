import {
  avisosDesdeFilas,
  BUCKET_IMAGENES_AVISOS,
  CONSULTA_AVISOS,
  crearServicioAvisos,
  type AvisoCiudad,
  type FilaAviso,
} from '@carmen-limpio/compartido';
import { conLimite, supabase } from './supabase';

// Con Supabase configurado se muestran los avisos publicados; sin él, los de ejemplo.
export const avisosReales = supabase !== null;

export interface AvisoConImagen extends AvisoCiudad {
  // URL firmada por una hora: el bucket es privado y solo entrega imágenes de avisos publicados.
  imagenUrl?: string;
}

const ejemplos = crearServicioAvisos();

export async function listarAvisos(): Promise<AvisoConImagen[]> {
  if (!supabase) return ejemplos.listar();
  const { data, error } = await conLimite(
    supabase.from('avisos').select(CONSULTA_AVISOS).eq('publicado', true).order('desde', { ascending: false }),
  );
  if (error) throw error;
  const avisos: AvisoConImagen[] = avisosDesdeFilas((data ?? []) as unknown as FilaAviso[], new Date());

  const rutas = avisos.map((a) => a.imagen?.ruta).filter((r): r is string => Boolean(r));
  if (rutas.length === 0) return avisos;
  // Si las imágenes fallan, los avisos se muestran igual, sin imagen.
  const { data: firmadas } = await conLimite(
    supabase.storage.from(BUCKET_IMAGENES_AVISOS).createSignedUrls(rutas, 3600),
  ).catch(() => ({ data: null }));
  const porRuta = new Map((firmadas ?? []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl]));
  return avisos.map((a) => (a.imagen ? { ...a, imagenUrl: porRuta.get(a.imagen.ruta) ?? undefined } : a));
}
