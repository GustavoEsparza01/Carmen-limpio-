import { DIAS_CARTEL, DIAS_SEMANA, NOMBRE_DIA, VENTANAS, type Dia, type Turno } from './constantes.ts';

export function listaDias(dias: readonly Dia[]): string {
  const nombres = DIAS_SEMANA.filter((d) => dias.includes(d)).map((d) => NOMBRE_DIA[d]);
  if (nombres.length < 2) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

export function textoHorario(dias: readonly Dia[], turno: Turno): string {
  const { inicio, fin } = VENTANAS[turno];
  return `${listaDias(dias)}, ${inicio} a ${fin}`;
}

// Null cuando el lugar sigue los días generales del cartel.
export function notaExcepcion(dias: readonly Dia[]): string | null {
  return dias.length < DIAS_CARTEL.length ? `Solo ${listaDias(dias)}` : null;
}
