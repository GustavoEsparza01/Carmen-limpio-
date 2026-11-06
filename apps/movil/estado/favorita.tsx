import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const CLAVE = 'carmen-limpio:favorita';

interface EstadoFavorita {
  favoritaId: string | null;
  cambiarFavorita: (id: string | null) => void;
}

const Contexto = createContext<EstadoFavorita>({ favoritaId: null, cambiarFavorita: () => {} });

export function ProveedorFavorita({ children }: { children: ReactNode }) {
  const [favoritaId, setFavoritaId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then(setFavoritaId)
      .catch(() => {});
  }, []);

  function cambiarFavorita(id: string | null) {
    setFavoritaId(id);
    const guardado = id ? AsyncStorage.setItem(CLAVE, id) : AsyncStorage.removeItem(CLAVE);
    guardado.catch(() => {});
  }

  return <Contexto.Provider value={{ favoritaId, cambiarFavorita }}>{children}</Contexto.Provider>;
}

export function useFavorita() {
  return useContext(Contexto);
}
