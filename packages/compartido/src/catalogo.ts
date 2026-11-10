import { coincide } from './busqueda.ts';
import { LUGARES } from './catalogo.generado.ts';
import type { Dia, Turno } from './constantes.ts';

export type TipoLugar = 'colonia' | 'fraccionamiento' | 'avenida' | 'calle' | 'privada' | 'otro';
export type Confianza = 'alta' | 'media' | 'baja' | 'ninguna';

export interface Horario {
  rutaId: string;
  numero: number;
  turno: Turno;
  dias: Dia[];
  confianza: Confianza;
  porConfirmar: boolean;
}

export interface Lugar {
  id: string;
  nombre: string;
  tipo: TipoLugar;
  horarios: Horario[];
}

export interface ParadaDeRuta {
  lugar: Lugar;
  horario: Horario;
}

export interface Ruta {
  id: string;
  numero: number;
  turno: Turno;
  paradas: ParadaDeRuta[];
}

export const ETIQUETA_CONFIANZA: Record<Confianza, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  ninguna: 'Sin ubicar',
};

export const ETIQUETA_TIPO: Record<TipoLugar, string | null> = {
  colonia: 'Colonia',
  fraccionamiento: 'Fraccionamiento',
  avenida: 'Avenida',
  calle: 'Calle',
  privada: 'Privada',
  otro: null,
};

export { LUGARES };

export function agruparRutas(lugares: readonly Lugar[] = LUGARES): Ruta[] {
  const rutas = new Map<string, Ruta>();
  for (const lugar of lugares) {
    for (const horario of lugar.horarios) {
      const { rutaId: id, numero, turno } = horario;
      if (!rutas.has(id)) rutas.set(id, { id, numero, turno, paradas: [] });
      rutas.get(id)?.paradas.push({ lugar, horario });
    }
  }
  return [...rutas.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// M1 y V1 son recorridos distintos: una ruta se identifica por turno y número.
export const RUTAS = agruparRutas();

// El catálogo incluido en la app es el respaldo sin conexión. Al llegar el de Supabase se reemplaza
// en el mismo arreglo, para que todo lo que ya importó LUGARES y RUTAS vea los datos nuevos.
export function reemplazarCatalogo(lugares: readonly Lugar[]): void {
  LUGARES.splice(0, LUGARES.length, ...lugares);
  RUTAS.splice(0, RUTAS.length, ...agruparRutas(LUGARES));
}

export function rutaPorId(id: string): Ruta | undefined {
  return RUTAS.find((r) => r.id === id);
}

// Sin día devuelve toda la ruta. Las excepciones por lugar quedan fuera de los días que no cubren.
export function paradasDelDia(ruta: Ruta, dia: Dia | null): ParadaDeRuta[] {
  return dia ? ruta.paradas.filter((p) => p.horario.dias.includes(dia)) : ruta.paradas;
}

export function buscarLugares(consulta: string): Lugar[] {
  return LUGARES.filter((l) => coincide(l.nombre, consulta));
}

export function lugarPorId(id: string): Lugar | undefined {
  return LUGARES.find((l) => l.id === id);
}

export function tieneMapa(lugar: Lugar): boolean {
  return lugar.horarios.some((h) => h.confianza !== 'ninguna');
}

export function etiquetaRuta(horario: Pick<Horario, 'numero' | 'turno'>): string {
  return `Ruta ${horario.numero} · turno ${horario.turno}`;
}

export function contarConfianza(): Record<Confianza, number> {
  const conteo: Record<Confianza, number> = { alta: 0, media: 0, baja: 0, ninguna: 0 };
  for (const { horario } of RUTAS.flatMap((r) => r.paradas)) conteo[horario.confianza] += 1;
  return conteo;
}

export function entradasSinUbicar(): (ParadaDeRuta & { rutaId: string })[] {
  return RUTAS.flatMap((r) =>
    r.paradas.filter((p) => p.horario.confianza === 'ninguna').map((p) => ({ ...p, rutaId: r.id })),
  );
}
