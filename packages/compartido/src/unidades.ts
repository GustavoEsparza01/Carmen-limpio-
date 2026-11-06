import { RUTAS } from './catalogo.ts';

export interface Unidad {
  numero: number;
  matutina: string | null;
  vespertina: string | null;
}

// Supuesto sin confirmar: un mismo vehículo cubre ambos turnos con el mismo número de ruta.
export const UNIDADES: Unidad[] = [...new Set(RUTAS.map((r) => r.numero))]
  .sort((a, b) => a - b)
  .map((numero) => ({
    numero,
    matutina: RUTAS.find((r) => r.numero === numero && r.turno === 'matutino')?.id ?? null,
    vespertina: RUTAS.find((r) => r.numero === numero && r.turno === 'vespertino')?.id ?? null,
  }));
