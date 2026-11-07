import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const INTERVALO_MS = 30_000;

// Mantiene la fecha al día mientras la app está abierta y al volver a ella.
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const actualizar = () => setAhora(new Date());
    const temporizador = setInterval(actualizar, INTERVALO_MS);
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') actualizar();
    });
    return () => {
      clearInterval(temporizador);
      suscripcion.remove();
    };
  }, []);

  return ahora;
}
