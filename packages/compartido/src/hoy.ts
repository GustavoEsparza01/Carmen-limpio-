import type { Horario } from './catalogo.ts';
import { DIAS_SEMANA, NOMBRE_DIA, VENTANAS, ZONA_HORARIA, type Dia, type Turno } from './constantes.ts';

export type EstadoHoy = 'antes' | 'enCurso' | 'terminada' | 'otroDia';

export interface ResumenHoy {
  estado: EstadoHoy;
  mensaje: string;
  // Hoy en Mérida, sin importar la zona del teléfono.
  dia: Dia;
  // Horarios de la ventana que menciona el mensaje: dos rutas pueden compartirla.
  horarios: Horario[];
  porConfirmar: boolean;
}

interface Momento {
  dia: Dia;
  minutos: number;
}

const DIA_EN_INGLES: Record<string, Dia> = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
  Sunday: 'domingo',
};

const FORMATO_MERIDA = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hourCycle: 'h23',
  minute: 'numeric',
  timeZone: ZONA_HORARIA,
  weekday: 'long',
});

export function momentoEnMerida(ahora: Date): Momento {
  const partes = FORMATO_MERIDA.formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  const dia = DIA_EN_INGLES[valor('weekday')];
  if (!dia) throw new Error(`Día no reconocido: ${valor('weekday')}`);
  return { dia, minutos: (Number(valor('hour')) % 24) * 60 + Number(valor('minute')) };
}

function aMinutos(hora: string): number {
  const [horas = 0, minutos = 0] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

const inicioDe = (turno: Turno) => aMinutos(VENTANAS[turno].inicio);
const finDe = (turno: Turno) => aMinutos(VENTANAS[turno].fin);

function horariosDelDia(horarios: readonly Horario[], dia: Dia): Horario[] {
  return horarios.filter((h) => h.dias.includes(dia)).sort((a, b) => inicioDe(a.turno) - inicioDe(b.turno));
}

function mismaVentana(horarios: readonly Horario[], turno: Turno): Horario[] {
  return horarios.filter((h) => h.turno === turno);
}

function resumen(
  estado: EstadoHoy,
  mensaje: string,
  dia: Dia,
  horarios: Horario[],
): ResumenHoy {
  return { dia, estado, horarios, mensaje, porConfirmar: horarios.some((h) => h.porConfirmar) };
}

// Primer día con ventana después de hoy. A los 7 días vuelve a ser el mismo día de la semana.
function proximaVentana(horarios: readonly Horario[], hoy: Dia) {
  const indice = DIAS_SEMANA.indexOf(hoy);
  for (let dias = 1; dias <= 7; dias++) {
    const dia = DIAS_SEMANA[(indice + dias) % DIAS_SEMANA.length]!;
    const delDia = horariosDelDia(horarios, dia);
    const [primero] = delDia;
    if (primero) return { dia, dias, turno: primero.turno, horarios: mismaVentana(delDia, primero.turno) };
  }
  return null;
}

// Solo compara la fecha con las ventanas de los carteles: nunca afirma qué hizo o hará un camión.
export function estadoDeHoy(horarios: readonly Horario[], ahora: Date): ResumenHoy | null {
  const { dia, minutos } = momentoEnMerida(ahora);
  const deHoy = horariosDelDia(horarios, dia);

  const abierta = deHoy.find((h) => minutos >= inicioDe(h.turno) && minutos < finDe(h.turno));
  if (abierta) {
    const { fin } = VENTANAS[abierta.turno];
    return resumen(
      'enCurso',
      `Ventana de recolección abierta, hasta las ${fin}`,
      dia,
      mismaVentana(deHoy, abierta.turno),
    );
  }

  const pendiente = deHoy.find((h) => minutos < inicioDe(h.turno));
  if (pendiente) {
    const { inicio, fin } = VENTANAS[pendiente.turno];
    return resumen(
      'antes',
      `Hoy es día de recolección, de ${inicio} a ${fin}`,
      dia,
      mismaVentana(deHoy, pendiente.turno),
    );
  }

  const proxima = proximaVentana(horarios, dia);
  if (!proxima) return null;

  if (deHoy.length > 0) {
    const nombre = NOMBRE_DIA[proxima.dia];
    const cuando = proxima.dias === 7 ? `${nombre} de la próxima semana` : nombre;
    return resumen('terminada', `La ventana de hoy terminó. Próxima: ${cuando}`, dia, proxima.horarios);
  }

  const { inicio, fin } = VENTANAS[proxima.turno];
  return resumen(
    'otroDia',
    `Próxima recolección: ${NOMBRE_DIA[proxima.dia]}, de ${inicio} a ${fin}`,
    dia,
    proxima.horarios,
  );
}
