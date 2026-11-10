import { lugarPorId } from './catalogo.ts';
import { DIAS_SEMANA, NOMBRE_DIA, VENTANAS, ZONA_HORARIA, type Dia } from './constantes.ts';
import { momentoEnMerida } from './hoy.ts';
import type { Coordenadas } from './trazado.ts';

// Reportes de demostración: se quedan en el dispositivo y no llegan a nadie.

export type TipoReporte = 'noPaso' | 'acumulacion' | 'tiradero';
export type EstadoReporte = 'recibido' | 'enRevision' | 'atendido' | 'rechazado';

export const NOMBRE_TIPO_REPORTE: Record<TipoReporte, string> = {
  noPaso: 'El camión no pasó',
  acumulacion: 'Acumulación de basura',
  tiradero: 'Tiradero clandestino',
};

export const NOMBRE_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  recibido: 'Recibido',
  enRevision: 'En revisión',
  atendido: 'Atendido',
  rechazado: 'Rechazado',
};

const SIGUIENTES: Record<EstadoReporte, readonly EstadoReporte[]> = {
  recibido: ['enRevision'],
  enRevision: ['atendido', 'rechazado'],
  atendido: [],
  rechazado: [],
};

const NOTAS_DEMOSTRACION: Record<EstadoReporte, string> = {
  recibido: 'Guardado en este teléfono.',
  enRevision: 'Nota de ejemplo: la demostración simula que alguien lo revisa.',
  atendido: 'Nota de ejemplo: la demostración simula que se atendió. Nadie recibió este reporte.',
  rechazado: 'Nota de ejemplo: la demostración simula un rechazo. Nadie recibió este reporte.',
};

export interface EventoReporte {
  estado: EstadoReporte;
  fecha: string;
  nota: string;
}

export interface BorradorReporte {
  tipo: TipoReporte;
  lugarId?: string;
  // Formato AAAA-MM-DD, en hora de Mérida.
  fecha?: string;
  punto?: Coordenadas;
  descripcion?: string;
  fotoUri?: string;
}

export interface Reporte extends BorradorReporte {
  id: string;
  creado: string;
  estado: EstadoReporte;
  historial: EventoReporte[];
}

const LARGO_MINIMO_DESCRIPCION = 10;
export const LARGO_MAXIMO_DESCRIPCION = 500;
export const DIAS_ATRAS_PERMITIDOS = 7;

const FORMATO_FECHA = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: ZONA_HORARIA,
  year: 'numeric',
});

export function fechaEnMerida(ahora: Date): string {
  return FORMATO_FECHA.format(ahora);
}

// De hoy hacia atrás, para elegir cuándo no pasó el camión.
export function fechasRecientes(ahora: Date): string[] {
  return Array.from({ length: DIAS_ATRAS_PERMITIDOS + 1 }, (_, dias) =>
    fechaEnMerida(new Date(ahora.getTime() - dias * 86_400_000)),
  );
}

// Día de la semana de una fecha AAAA-MM-DD, sin depender de la zona del teléfono.
export function diaDeFecha(fecha: string): Dia {
  const instante = new Date(`${fecha}T12:00:00Z`);
  return DIAS_SEMANA[(instante.getUTCDay() + 6) % 7]!;
}

const minutosDe = (hora: string) => {
  const [h = 0, m = 0] = hora.split(':').map(Number);
  return h * 60 + m;
};

// Solo los días en que el cartel marca recolección en ese lugar. Hoy cuenta cuando ya terminó
// alguna de sus ventanas: antes no se puede saber que el camión no pasó.
export function fechasConRecoleccion(lugarId: string | undefined, ahora: Date): string[] {
  const lugar = lugarId ? lugarPorId(lugarId) : undefined;
  if (!lugar) return [];
  const [hoy] = fechasRecientes(ahora);
  const { minutos } = momentoEnMerida(ahora);
  return fechasRecientes(ahora).filter((fecha) => {
    const delDia = lugar.horarios.filter((h) => h.dias.includes(diaDeFecha(fecha)));
    if (fecha !== hoy) return delDia.length > 0;
    return delDia.some((h) => minutosDe(VENTANAS[h.turno].fin) <= minutos);
  });
}

export function etiquetaFecha(fecha: string, ahora: Date): string {
  const [hoy, ayer] = fechasRecientes(ahora);
  if (fecha === hoy) return 'Hoy';
  if (fecha === ayer) return 'Ayer';
  const instante = new Date(`${fecha}T12:00:00Z`);
  const dia = diaDeFecha(fecha);
  return `${NOMBRE_DIA[dia].replace(/^./, (letra) => letra.toUpperCase())} ${instante.getUTCDate()}`;
}

export function fechaHoraLegible(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: 'short',
    timeZone: ZONA_HORARIA,
  }).format(new Date(iso));
}

// Las claves son los campos del formulario, para mostrar cada error junto a su campo.
export function validarReporte(borrador: BorradorReporte, ahora: Date): Partial<Record<keyof BorradorReporte, string>> {
  const errores: Partial<Record<keyof BorradorReporte, string>> = {};
  const descripcion = borrador.descripcion?.trim() ?? '';
  const pideLugar = borrador.tipo !== 'tiradero';
  const pideDescripcion = borrador.tipo !== 'noPaso';

  if (pideLugar && !(borrador.lugarId && lugarPorId(borrador.lugarId))) {
    errores.lugarId = 'Elige un lugar de la lista.';
  }
  if (borrador.tipo === 'noPaso') {
    if (!fechasRecientes(ahora).includes(borrador.fecha ?? '')) {
      errores.fecha = 'Elige una fecha de los últimos 7 días.';
    } else if (!errores.lugarId && !fechasConRecoleccion(borrador.lugarId, ahora).includes(borrador.fecha ?? '')) {
      errores.fecha = 'Ese día no hay recolección en este lugar, según el cartel.';
    }
  }
  if (borrador.tipo === 'tiradero' && !borrador.punto) {
    errores.punto = 'Toca el mapa para marcar el punto.';
  }
  if (pideDescripcion && descripcion.length < LARGO_MINIMO_DESCRIPCION) {
    errores.descripcion = `Describe lo que ves en al menos ${LARGO_MINIMO_DESCRIPCION} caracteres.`;
  } else if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
    errores.descripcion = `Usa ${LARGO_MAXIMO_DESCRIPCION} caracteres o menos.`;
  }
  if (borrador.tipo === 'tiradero' && !borrador.fotoUri) {
    errores.fotoUri = 'Agrega una foto.';
  }
  return errores;
}

export function crearReporte(borrador: BorradorReporte, id: string, ahora: Date): Reporte {
  const creado = ahora.toISOString();
  const descripcion = borrador.descripcion?.trim();
  return {
    ...borrador,
    ...(descripcion ? { descripcion } : {}),
    creado,
    estado: 'recibido',
    historial: [{ estado: 'recibido', fecha: creado, nota: NOTAS_DEMOSTRACION.recibido }],
    id,
  };
}

export function siguientesEstados(estado: EstadoReporte): readonly EstadoReporte[] {
  return SIGUIENTES[estado];
}

export function avanzarReporte(reporte: Reporte, estado: EstadoReporte, ahora: Date): Reporte {
  if (!SIGUIENTES[reporte.estado].includes(estado)) {
    throw new Error(`Cambio no permitido: ${reporte.estado} a ${estado}`);
  }
  const evento = { estado, fecha: ahora.toISOString(), nota: NOTAS_DEMOSTRACION[estado] };
  return { ...reporte, estado, historial: [...reporte.historial, evento] };
}

// Para la línea de tiempo: incluye los pasos que faltan, y la rama que tomó el reporte.
export function pasosDeLinea(reporte: Pick<Reporte, 'estado'>): EstadoReporte[] {
  return ['recibido', 'enRevision', reporte.estado === 'rechazado' ? 'rechazado' : 'atendido'];
}

function esReporte(valor: unknown): valor is Reporte {
  if (typeof valor !== 'object' || valor === null) return false;
  const { id, tipo, estado, historial } = valor as Partial<Reporte>;
  return (
    typeof id === 'string' &&
    typeof tipo === 'string' &&
    tipo in NOMBRE_TIPO_REPORTE &&
    typeof estado === 'string' &&
    estado in NOMBRE_ESTADO_REPORTE &&
    Array.isArray(historial)
  );
}

export function leerReportes(texto: string | null): Reporte[] {
  if (texto === null) return [];
  try {
    const datos: unknown = JSON.parse(texto);
    return Array.isArray(datos) ? datos.filter(esReporte) : [];
  } catch {
    return [];
  }
}
