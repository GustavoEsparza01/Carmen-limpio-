import { lugarPorId, type Horario, type Lugar } from './catalogo.ts';
import {
  AVISO_FUENTE_HOY,
  AVISO_NO_OFICIAL,
  DIAS_SEMANA,
  VENTANAS,
  type Dia,
  type Turno,
} from './constantes.ts';
import type { LugarGuardado, Recordatorio } from './guardados.ts';
import { textoHorario } from './horario.ts';
import { momentoEnMerida } from './hoy.ts';

// Hasta dónde se programa. La app vuelve a programar cada vez que se abre.
const DIAS_PROGRAMADOS = 28;
const MINUTOS_DIA = 24 * 60;
const NOCHE_ANTERIOR_MIN = 20 * 60;
const ANTES_DE_VENTANA_MIN = 60;

export interface AvisoProgramado {
  // Estable: la misma ventana conserva su id aunque se vuelva a programar.
  id: string;
  fecha: Date;
  titulo: string;
  cuerpo: string;
}

function aMinutos(hora: string): number {
  const [horas = 0, minutos = 0] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

// Mérida no cambia de horario, así que sumar minutos desde "ahora" da el instante correcto
// sin importar la zona del teléfono.
function instanteEnMerida(ahora: Date, dias: number, minutos: number): Date {
  const momento = momentoEnMerida(ahora);
  const inicioDelMinuto = Math.floor(ahora.getTime() / 60_000) * 60_000;
  return new Date(inicioDelMinuto + (dias * MINUTOS_DIA + minutos - momento.minutos) * 60_000);
}

function diaDentroDe(hoy: Dia, dias: number): Dia {
  return DIAS_SEMANA[(DIAS_SEMANA.indexOf(hoy) + dias) % DIAS_SEMANA.length]!;
}

function fechaDelAviso(ahora: Date, dias: number, turno: Turno, tipo: Recordatorio): Date {
  if (tipo === 'nocheAnterior') return instanteEnMerida(ahora, dias - 1, NOCHE_ANTERIOR_MIN);
  return instanteEnMerida(ahora, dias, aMinutos(VENTANAS[turno].inicio) - ANTES_DE_VENTANA_MIN);
}

function crearAviso(lugar: Lugar, horario: Horario, dia: Dia, dias: number, fecha: Date, tipo: Recordatorio): AvisoProgramado {
  const { inicio, fin } = VENTANAS[horario.turno];
  const cuando = tipo === 'nocheAnterior' ? 'Mañana' : 'Hoy';
  const duda = horario.porConfirmar ? ' Por confirmar.' : '';
  return {
    id: `carmen-limpio:${lugar.id}:${horario.turno}:${dias}:${dia}`,
    fecha,
    titulo: `${cuando} es día de recolección en ${lugar.nombre}`,
    cuerpo: `Ventana de ${inicio} a ${fin}.${duda} ${AVISO_FUENTE_HOY}`,
  };
}

// Solo fechas futuras y una por ventana: dos rutas en la misma ventana dan un solo aviso.
export function avisosDeLugar(lugar: Lugar, tipo: Recordatorio, ahora: Date): AvisoProgramado[] {
  if (tipo === 'ninguno') return [];
  const { dia: hoy } = momentoEnMerida(ahora);
  const avisos: AvisoProgramado[] = [];
  for (let dias = 0; dias <= DIAS_PROGRAMADOS; dias++) {
    const dia = diaDentroDe(hoy, dias);
    const delDia = lugar.horarios.filter((h) => h.dias.includes(dia));
    for (const turno of new Set(delDia.map((h) => h.turno))) {
      const horario = delDia.find((h) => h.turno === turno)!;
      const fecha = fechaDelAviso(ahora, dias, turno, tipo);
      if (fecha > ahora) avisos.push(crearAviso(lugar, horario, dia, dias, fecha, tipo));
    }
  }
  return avisos;
}

export function avisosProgramados(guardados: readonly LugarGuardado[], ahora: Date): AvisoProgramado[] {
  return guardados
    .flatMap((g) => {
      const lugar = lugarPorId(g.lugarId);
      return lugar ? avisosDeLugar(lugar, g.recordatorio, ahora) : [];
    })
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export function textoCompartir(lugar: Lugar): string {
  const lineas = lugar.horarios.map((h) => {
    const duda = h.porConfirmar ? ' (por confirmar)' : '';
    return `Ruta ${h.numero}, ${h.turno}: ${textoHorario(h.dias, h.turno)}${duda}`;
  });
  return [`Recolección en ${lugar.nombre}`, ...lineas, AVISO_FUENTE_HOY, AVISO_NO_OFICIAL].join('\n');
}

export function descripcionRecordatorio(tipo: Recordatorio): string | null {
  if (tipo === 'nocheAnterior') return 'La noche anterior, después de las 20:00. Android puede retrasarlo hasta una hora.';
  if (tipo === 'antesDeVentana') return 'Durante la hora previa a que abra la ventana.';
  return null;
}
