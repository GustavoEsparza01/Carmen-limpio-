import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { URL_PRUEBA_MAPA } from '../componentes/mapaBase';

const LIMITE_MS = 6_000;

// MapLibre no avisa cuando fallan los mosaicos, así que se comprueba el servidor al entrar.
export function useMapaDisponible() {
  const [disponible, setDisponible] = useState(true);

  const comprobar = useCallback(() => {
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), LIMITE_MS);
    fetch(URL_PRUEBA_MAPA, { method: 'HEAD', signal: control.signal })
      .then(() => setDisponible(true))
      .catch(() => setDisponible(false))
      .finally(() => clearTimeout(limite));
  }, []);

  useFocusEffect(comprobar);

  return { disponible, comprobar };
}
