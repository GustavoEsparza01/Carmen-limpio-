import { CONSULTA_LUGARES, lugaresDesdeFilas, reemplazarCatalogo, type FilaLugar } from '@carmen-limpio/compartido';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type ReactNode } from 'react';
import { conLimite, supabase } from './supabase';

const CLAVE = 'carmen-limpio:catalogo:v1';

function aplicar(texto: string | null): boolean {
  if (!texto) return false;
  try {
    reemplazarCatalogo(lugaresDesdeFilas(JSON.parse(texto) as FilaLugar[]));
    return true;
  } catch {
    return false;
  }
}

// Descarga el catálogo y lo guarda para el siguiente arranque. No lo cambia a media sesión:
// así una pantalla abierta no ve aparecer o desaparecer lugares.
async function actualizarEnSegundoPlano() {
  if (!supabase) return;
  const { data, error } = await conLimite(supabase.from('lugares').select(CONSULTA_LUGARES));
  if (error || !data) return;
  lugaresDesdeFilas(data as unknown as FilaLugar[]);
  await AsyncStorage.setItem(CLAVE, JSON.stringify(data));
}

// Arranca con el último catálogo descargado o, si no hay, con el incluido en la app.
export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then(aplicar)
      .catch(() => false)
      .finally(() => {
        setListo(true);
        actualizarEnSegundoPlano().catch(() => {});
      });
  }, []);

  return listo ? children : null;
}
