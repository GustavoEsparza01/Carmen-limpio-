import {
  avisosDesdeFilas,
  CONSULTA_AVISOS,
  crearServicioAvisos,
  type AvisoCiudad,
  type FilaAviso,
} from '@carmen-limpio/compartido';
import { conLimite, supabase } from './supabase';

// Con Supabase configurado se muestran los avisos publicados; sin él, los de ejemplo.
export const avisosReales = supabase !== null;

const ejemplos = crearServicioAvisos();

export async function listarAvisos(): Promise<AvisoCiudad[]> {
  if (!supabase) return ejemplos.listar();
  const { data, error } = await conLimite(
    supabase.from('avisos').select(CONSULTA_AVISOS).eq('publicado', true).order('desde', { ascending: false }),
  );
  if (error) throw error;
  return avisosDesdeFilas((data ?? []) as FilaAviso[], new Date());
}
