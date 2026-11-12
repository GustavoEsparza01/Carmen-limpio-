import {
  cambiarRecordatorio as cambiarEnLista,
  guardarLugar,
  migrarGuardados,
  quitarLugar,
  type EtiquetaLugar,
  type LugarGuardado,
  type Recordatorio,
} from '@carmen-limpio/compartido';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { pedirPermiso, reprogramar } from './notificaciones';

const CLAVE_GUARDADOS = 'carmen-limpio:guardados';
const CLAVE_ANTERIOR = 'carmen-limpio:favorita';
const CLAVE_BIENVENIDA = 'carmen-limpio:bienvenida';

interface EstadoGuardados {
  cargado: boolean;
  bienvenidaVista: boolean;
  guardados: LugarGuardado[];
  guardar: (lugarId: string, etiqueta: EtiquetaLugar) => void;
  quitar: (lugarId: string) => void;
  // Devuelve false si la persona negó el permiso de notificaciones.
  cambiarRecordatorio: (lugarId: string, recordatorio: Recordatorio) => Promise<boolean>;
  marcarBienvenida: () => void;
}

const Contexto = createContext<EstadoGuardados>({
  bienvenidaVista: true,
  cambiarRecordatorio: async () => false,
  cargado: false,
  guardados: [],
  guardar: () => {},
  marcarBienvenida: () => {},
  quitar: () => {},
});

export function ProveedorGuardados({ children }: { children: ReactNode }) {
  const [cargado, setCargado] = useState(false);
  const [bienvenidaVista, setBienvenidaVista] = useState(true);
  const [guardados, setGuardados] = useState<LugarGuardado[]>([]);
  const actual = useRef(guardados);

  useEffect(() => {
    AsyncStorage.multiGet([CLAVE_GUARDADOS, CLAVE_ANTERIOR, CLAVE_BIENVENIDA])
      .then(([[, lista = null] = [], [, anterior = null] = [], [, bienvenida = null] = []]) => {
        const leidos = migrarGuardados(lista, anterior);
        actual.current = leidos;
        setGuardados(leidos);
        // Quien ya tenía un lugar guardado no es una instalación nueva.
        setBienvenidaVista(bienvenida !== null || anterior !== null);
        reprogramar(leidos).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  function actualizar(lista: LugarGuardado[]) {
    actual.current = lista;
    setGuardados(lista);
    AsyncStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(lista)).catch(() => {});
    reprogramar(lista).catch(() => {});
  }

  async function cambiarRecordatorio(lugarId: string, recordatorio: Recordatorio) {
    if (recordatorio !== 'ninguno' && !(await pedirPermiso())) return false;
    actualizar(cambiarEnLista(actual.current, lugarId, recordatorio));
    return true;
  }

  function marcarBienvenida() {
    setBienvenidaVista(true);
    AsyncStorage.setItem(CLAVE_BIENVENIDA, 'vista').catch(() => {});
  }

  return (
    <Contexto.Provider
      value={{
        bienvenidaVista,
        cambiarRecordatorio,
        cargado,
        guardados,
        guardar: (lugarId, etiqueta) => actualizar(guardarLugar(actual.current, lugarId, etiqueta)),
        marcarBienvenida,
        quitar: (lugarId) => actualizar(quitarLugar(actual.current, lugarId)),
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useGuardados() {
  return useContext(Contexto);
}
