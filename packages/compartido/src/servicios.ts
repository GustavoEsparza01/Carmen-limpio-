export type TipoAviso = 'horario' | 'servicio' | 'general';

export interface AvisoCiudad {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  // Nombres de los lugares afectados; vacío si es para toda la ciudad.
  lugares?: string[];
  // Ruta dentro del bucket avisos-imagenes; la app pide una URL firmada para mostrarla.
  imagen?: { ruta: string; descripcion: string } | null;
}

// En Supabase: bucket privado con imágenes de avisos publicados (ver supabase/migrations/0010).
export const BUCKET_IMAGENES_AVISOS = 'avisos-imagenes';

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

export function crearServicioAvisos(): ServicioAvisos {
  return { listar: async () => [...AVISOS_EJEMPLO] };
}
