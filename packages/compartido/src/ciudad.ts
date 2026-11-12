import { RUTAS, type Ruta } from './catalogo.ts';
import type { Turno } from './constantes.ts';
import { limitesDe, trazadoDeRuta, type Coordenadas } from './trazado.ts';

// Escenario `carteles`. El mapa distingue las rutas por color y el turno por el tipo de línea,
// y la tarjeta las nombra: ningún dato depende solo del color.

// Elegidos por búsqueda: contrastan 3:1 con el mapa claro y se separan en visión normal,
// protanopia, deuteranopia y tritanopia (ver docs/decisiones.md).
export const COLORES_RUTA = [
  '#338899',
  '#FF4411',
  '#220066',
  '#DD44EE',
  '#998866',
  '#4411FF',
  '#771100',
  '#441133',
] as const;

export interface PropiedadesTrazado {
  rutaId: string;
  numero: number;
  turno: Turno;
  color: string;
}

export interface TrazadosDeCiudad {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: PropiedadesTrazado;
    geometry: { type: 'LineString'; coordinates: Coordenadas[] };
  }[];
}

// Una ruta conserva el color de su número en ambos turnos: las separa el tipo de línea.
export function colorDeRuta(numero: number): string {
  return COLORES_RUTA[(numero - 1) % COLORES_RUTA.length]!;
}

export function rutasDeTurno(turno: Turno | null): Ruta[] {
  return turno ? RUTAS.filter((r) => r.turno === turno) : RUTAS;
}

function crearTrazados(): TrazadosDeCiudad {
  return {
    type: 'FeatureCollection',
    features: RUTAS.flatMap((ruta) => {
      const trazado = trazadoDeRuta(ruta.id);
      if (!trazado) return [];
      const { id: rutaId, numero, turno } = ruta;
      return [
        {
          type: 'Feature' as const,
          properties: { rutaId, numero, turno, color: colorDeRuta(numero) },
          geometry: { type: 'LineString' as const, coordinates: trazado.linea },
        },
      ];
    }),
  };
}

// Una sola colección para todo el mapa; filtrar no vuelve a generarla.
export const TRAZADOS_CIUDAD = crearTrazados();

function limitesDeTrazados(trazados: TrazadosDeCiudad): ReturnType<typeof limitesDe> {
  return limitesDe({ linea: trazados.features.flatMap((f) => f.geometry.coordinates), paradas: [] });
}

export const LIMITES_CIUDAD = limitesDeTrazados(TRAZADOS_CIUDAD);

// Las rutas pueden compartir calle: un toque puede alcanzar varias, una vez cada una.
export function rutasTocadas(propiedades: readonly (Partial<PropiedadesTrazado> | null | undefined)[]): string[] {
  const ids = propiedades.flatMap((p) => (p?.rutaId ? [p.rutaId] : []));
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}
