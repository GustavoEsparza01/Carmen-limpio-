import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Solo la clave anon (pública). La service_role jamás llega a la app.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sin configuración la app sigue funcionando con los datos incluidos.
export const supabase: SupabaseClient | null =
  url && clave
    ? createClient(url, clave, {
        auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

const LIMITE_MS = 8_000;

// Una consulta lenta no debe dejar la pantalla esperando: se corta y se usa lo que ya hay.
export function conLimite<T>(promesa: PromiseLike<T>, ms = LIMITE_MS): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), ms);
    Promise.resolve(promesa).then(
      (valor) => {
        clearTimeout(reloj);
        resolver(valor);
      },
      (error) => {
        clearTimeout(reloj);
        rechazar(error);
      },
    );
  });
}
