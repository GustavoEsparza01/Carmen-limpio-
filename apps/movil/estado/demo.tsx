import {
  crearServicioReportes,
  crearServicioSesion,
  type Almacen,
  type BorradorReporte,
  type EstadoReporte,
  type Reporte,
  type Sesion,
} from '@carmen-limpio/compartido';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { borrarFoto } from './fotos';

const almacen: Almacen = {
  borrar: (clave) => AsyncStorage.removeItem(clave),
  escribir: (clave, valor) => AsyncStorage.setItem(clave, valor),
  leer: (clave) => AsyncStorage.getItem(clave),
};

// Reportes y sesión siguen en modo demostración hasta la Fase 4. Los avisos ya vienen de Supabase (estado/avisos.ts).
const sesiones = crearServicioSesion(almacen);
const reportesLocales = crearServicioReportes(almacen);

interface EstadoDemo {
  cargado: boolean;
  sesion: Sesion | null;
  reportes: Reporte[];
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
  crear: (borrador: BorradorReporte) => Promise<Reporte>;
  cambiarEstado: (id: string, estado: EstadoReporte) => Promise<void>;
  borrarTodo: () => Promise<void>;
}

const Contexto = createContext<EstadoDemo | null>(null);

export function ProveedorDemo({ children }: { children: ReactNode }) {
  const [cargado, setCargado] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);

  useEffect(() => {
    Promise.all([sesiones.actual(), reportesLocales.listar()])
      .then(([actual, lista]) => {
        setSesion(actual);
        setReportes(lista);
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  const recargar = async () => setReportes(await reportesLocales.listar());

  const valor: EstadoDemo = {
    borrarTodo: async () => {
      const borrados = await reportesLocales.borrarTodo();
      borrados.forEach((r) => r.fotoUri && borrarFoto(r.fotoUri));
      await recargar();
    },
    cambiarEstado: async (id, estado) => {
      await reportesLocales.cambiarEstado(id, estado);
      await recargar();
    },
    cargado,
    crear: async (borrador) => {
      const reporte = await reportesLocales.crear(borrador);
      await recargar();
      return reporte;
    },
    entrar: async () => setSesion(await sesiones.entrar()),
    reportes,
    salir: async () => {
      await sesiones.salir();
      setSesion(null);
    },
    sesion,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDemo() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useDemo debe usarse dentro de ProveedorDemo');
  return valor;
}
