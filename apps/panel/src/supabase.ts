import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Solo la clave anon (pública). La service_role jamás llega al panel: los permisos los da la RLS.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && clave ? createClient(url, clave) : null;

// Fecha de hoy en Ciudad del Carmen (AAAA-MM-DD).
export function hoyMerida(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Merida' }).format(new Date());
}
