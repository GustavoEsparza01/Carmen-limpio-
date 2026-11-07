import {
  avanzarReporte,
  crearReporte,
  leerReportes,
  type BorradorReporte,
  type EstadoReporte,
  type Reporte,
} from './reportes.ts';

// Las pantallas solo conocen estas interfaces. Para conectar el backend basta otra implementación.

export interface Sesion {
  nombre: string;
  demostracion: true;
  privacidadAceptada: string;
}

export interface ServicioSesion {
  actual(): Promise<Sesion | null>;
  entrar(): Promise<Sesion>;
  salir(): Promise<void>;
}

export interface ServicioReportes {
  listar(): Promise<Reporte[]>;
  obtener(id: string): Promise<Reporte | null>;
  crear(borrador: BorradorReporte): Promise<Reporte>;
  cambiarEstado(id: string, estado: EstadoReporte): Promise<Reporte>;
  borrarTodo(): Promise<Reporte[]>;
}

export type TipoAviso = 'horario' | 'servicio' | 'general';

export interface AvisoCiudad {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
}

export interface ServicioAvisos {
  listar(): Promise<AvisoCiudad[]>;
}

// Solo muestran cómo se verá la sección: no describen ningún hecho real.
export const AVISOS_EJEMPLO: readonly AvisoCiudad[] = [
  {
    id: 'ejemplo-horario',
    tipo: 'horario',
    titulo: 'Ejemplo: cambio de ventana por día festivo',
    texto: 'Así se vería un aviso sobre un cambio de horario en una ruta. Este texto no es real.',
  },
  {
    id: 'ejemplo-servicio',
    tipo: 'servicio',
    titulo: 'Ejemplo: ruta con servicio suspendido',
    texto: 'Así se vería un aviso sobre una suspensión temporal. Este texto no es real.',
  },
  {
    id: 'ejemplo-general',
    tipo: 'general',
    titulo: 'Ejemplo: recomendación para sacar la basura',
    texto: 'Así se vería un consejo general para los vecinos. Este texto no es real.',
  },
];

export interface Almacen {
  leer(clave: string): Promise<string | null>;
  escribir(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
}

const CLAVE_SESION = 'carmen-limpio:demo:sesion';
const CLAVE_REPORTES = 'carmen-limpio:demo:reportes';

export function crearServicioSesion(almacen: Almacen, reloj: () => Date = () => new Date()): ServicioSesion {
  return {
    async actual() {
      const texto = await almacen.leer(CLAVE_SESION);
      if (!texto) return null;
      try {
        return JSON.parse(texto) as Sesion;
      } catch {
        return null;
      }
    },
    async entrar() {
      const sesion: Sesion = {
        demostracion: true,
        nombre: 'Vecino de demostración',
        privacidadAceptada: reloj().toISOString(),
      };
      await almacen.escribir(CLAVE_SESION, JSON.stringify(sesion));
      return sesion;
    },
    salir: () => almacen.borrar(CLAVE_SESION),
  };
}

export function crearServicioReportes(almacen: Almacen, reloj: () => Date = () => new Date()): ServicioReportes {
  const leer = async () => leerReportes(await almacen.leer(CLAVE_REPORTES));
  const escribir = (lista: Reporte[]) => almacen.escribir(CLAVE_REPORTES, JSON.stringify(lista));

  return {
    listar: leer,
    obtener: async (id) => (await leer()).find((r) => r.id === id) ?? null,
    async crear(borrador) {
      const ahora = reloj();
      const lista = await leer();
      const reporte = crearReporte(borrador, `reporte-${ahora.getTime()}-${lista.length}`, ahora);
      await escribir([reporte, ...lista]);
      return reporte;
    },
    async cambiarEstado(id, estado) {
      const lista = await leer();
      const reporte = lista.find((r) => r.id === id);
      if (!reporte) throw new Error(`No existe el reporte ${id}`);
      const cambiado = avanzarReporte(reporte, estado, reloj());
      await escribir(lista.map((r) => (r.id === id ? cambiado : r)));
      return cambiado;
    },
    async borrarTodo() {
      const lista = await leer();
      await almacen.borrar(CLAVE_REPORTES);
      return lista;
    },
  };
}

export function crearServicioAvisos(): ServicioAvisos {
  return { listar: async () => [...AVISOS_EJEMPLO] };
}
