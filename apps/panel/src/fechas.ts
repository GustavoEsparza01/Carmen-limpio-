import { ZONA_HORARIA } from '@carmen-limpio/compartido';

// Los campos datetime-local no traen zona: se interpretan siempre como hora de Mérida,
// sin importar la zona de la computadora desde donde se usa el panel.

const PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partes(instante: Date): Record<string, string> {
  return Object.fromEntries(PARTES.formatToParts(instante).map((p) => [p.type, p.value]));
}

// ISO → 'AAAA-MM-DDTHH:mm' en hora de Mérida, para un input datetime-local.
export function aCampoMerida(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// 'AAAA-MM-DDTHH:mm' en hora de Mérida → ISO en UTC.
export function desdeCampoMerida(campo: string): string {
  const [fecha = '', hora = '00:00'] = campo.split('T');
  const [a, m, d] = fecha.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const comoUtc = Date.UTC(a!, m! - 1, d!, h!, min!);
  // Diferencia entre lo que marca el reloj de Mérida en ese instante y UTC.
  const p = partes(new Date(comoUtc));
  const reloj = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!);
  return new Date(comoUtc - (reloj - comoUtc)).toISOString();
}

export function fechaLegible(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA_HORARIA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

// 'AAAA-MM-DD' → 'DD/MM/AAAA'. La fecha ya está en hora de Mérida: no se convierte.
export function fechaCorta(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}
