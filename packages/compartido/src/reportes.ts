import { lugarPorId } from './catalogo.ts';
import { DIAS_SEMANA, NOMBRE_DIA, VENTANAS, ZONA_HORARIA, type Dia } from './constantes.ts';
import { momentoEnMerida } from './hoy.ts';
import type { Coordenadas } from './trazado.ts';

// Reportes de vecinos. Se guardan en Supabase y los atiende el equipo del proyecto como demostración.

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

// Bucket privado: <autor>/<archivo>. Solo lo leen quien reportó y administración.
export const BUCKET_FOTOS_REPORTES = 'fotos-reportes';

// Igual que la base: cada cambio de estado lleva una nota nueva de al menos 3 caracteres.
export const LARGO_MINIMO_NOTA = 3;
export const LARGO_MAXIMO_NOTA = 500;

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
  // Foto en el teléfono, antes de subirla.
  fotoUri?: string;
}

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  lugarId?: string;
  fecha?: string;
  punto?: Coordenadas;
  descripcion?: string;
  // Ruta dentro del bucket privado de fotos.
  foto?: string;
  creado: string;
  estado: EstadoReporte;
  // Última nota, siempre visible para quien reportó.
  nota: string;
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

export function siguientesEstados(estado: EstadoReporte): readonly EstadoReporte[] {
  return SIGUIENTES[estado];
}

// Para el panel: el mismo error que daría la base, antes de enviar.
export function validarCambioEstado(actual: EstadoReporte, nuevo: EstadoReporte, nota: string): string | null {
  if (!SIGUIENTES[actual].includes(nuevo)) return 'Ese cambio de estado no está permitido.';
  const limpia = nota.trim();
  if (limpia.length < LARGO_MINIMO_NOTA) return 'Escribe una nota para el vecino.';
  if (limpia.length > LARGO_MAXIMO_NOTA) return `Usa ${LARGO_MAXIMO_NOTA} caracteres o menos.`;
  return null;
}

// Para la línea de tiempo: incluye los pasos que faltan, y la rama que tomó el reporte.
export function pasosDeLinea(reporte: Pick<Reporte, 'estado'>): EstadoReporte[] {
  return ['recibido', 'enRevision', reporte.estado === 'rechazado' ? 'rechazado' : 'atendido'];
}

// Cuentas ---------------------------------------------------------------------

export const LARGO_MINIMO_CLAVE = 8;

export function validarCuenta(correo: string, clave: string): { correo?: string; clave?: string } {
  const errores: { correo?: string; clave?: string } = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) errores.correo = 'Escribe un correo válido.';
  if (clave.length < LARGO_MINIMO_CLAVE) errores.clave = `Usa al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  return errores;
}

// Traduce los errores de Supabase a frases para el vecino. Los mensajes de la base están en
// supabase/migrations (preparar_reporte y las políticas de reportes).
export function mensajeError(error: { code?: string; message?: string } | null | undefined): string {
  const mensaje = error?.message ?? '';
  if (/límite de \d+ reportes/i.test(mensaje)) return 'Llegaste al límite de 10 reportes en 24 horas. Intenta mañana.';
  if (error?.code === '23505') return 'Ya habías reportado que el camión no pasó ese día en ese lugar.';
  if (/no hay recolección/i.test(mensaje)) return 'Ese día no hay recolección en este lugar, según el cartel.';
  if (/row-level security/i.test(mensaje)) return 'Acepta el aviso de privacidad para poder reportar.';
  if (/invalid login credentials/i.test(mensaje)) return 'El correo o la contraseña no coinciden.';
  if (/already registered|already exists/i.test(mensaje)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/email not confirmed/i.test(mensaje)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a intentar.';
  if (/password/i.test(mensaje) && /(weak|short|at least)/i.test(mensaje)) {
    return `La contraseña es muy débil. Usa al menos ${LARGO_MINIMO_CLAVE} caracteres.`;
  }
  if (/rate limit|too many/i.test(mensaje)) return 'Hubo demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (/network|fetch|tiempo de espera/i.test(mensaje)) return 'No hay conexión. Revisa tu internet y vuelve a intentar.';
  return 'No se pudo completar. Vuelve a intentar en un momento.';
}
