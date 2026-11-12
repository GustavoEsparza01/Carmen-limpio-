import type { Confianza } from './catalogo.ts';
import { TRAZADOS } from './trazado.generado.ts';

export type Coordenadas = [longitud: number, latitud: number];

export interface ParadaTrazada {
  // Varios lugares pueden compartir un punto; sus días no siempre coinciden.
  lugarIds: string[];
  coordenadas: Coordenadas;
  confianza: Exclude<Confianza, 'ninguna'>;
}

// Escenario `carteles`. Nunca agregues aquí geometría de `propuesta`.
export interface Trazado {
  linea: Coordenadas[];
  paradas: ParadaTrazada[];
}

export { TRAZADOS };

export function trazadoDeRuta(rutaId: string): Trazado | undefined {
  return TRAZADOS[rutaId];
}

export function lugaresUbicados(trazado: Trazado): number {
  return new Set(trazado.paradas.flatMap((p) => p.lugarIds)).size;
}

export function limitesDe(trazado: Trazado): [oeste: number, sur: number, este: number, norte: number] {
  const puntos = [...trazado.linea, ...trazado.paradas.map((p) => p.coordenadas)];
  const longitudes = puntos.map(([longitud]) => longitud);
  const latitudes = puntos.map(([, latitud]) => latitud);
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)];
}

export function paradasDeLugar(trazado: Trazado, lugarId: string): ParadaTrazada[] {
  return trazado.paradas.filter((p) => p.lugarIds.includes(lugarId));
}

// Punto de un lugar en el trazado de carteles (el primero que lo incluya). Sin ubicar: undefined.
export function ubicacionDeLugar(lugarId: string): Coordenadas | undefined {
  for (const trazado of Object.values(TRAZADOS)) {
    const parada = trazado.paradas.find((p) => p.lugarIds.includes(lugarId));
    if (parada) return parada.coordenadas;
  }
  return undefined;
}
