import type { Coordenadas } from './trazado.ts';

// Camión de demostración: avanza sobre el trazado ilustrativo a velocidad acelerada.
// No representa la ubicación de ningún camión real y no sirve para estimar llegadas.

const RADIO_TIERRA_M = 6_371_000;
const VELOCIDAD_DEMO_M_S = 150;
const DURACION_MINIMA_MS = 20_000;
const DURACION_MAXIMA_MS = 120_000;

export interface Recorrido {
  linea: Coordenadas[];
  // Distancia en metros desde el inicio hasta cada punto de `linea`.
  acumulado: number[];
  longitud: number;
}

export interface PosicionSimulada {
  coordenadas: Coordenadas;
  haciaElOeste: boolean;
}

function aRadianes(grados: number) {
  return (grados * Math.PI) / 180;
}

export function distanciaEnMetros(a: Coordenadas, b: Coordenadas): number {
  const dLatitud = aRadianes(b[1] - a[1]);
  const dLongitud = aRadianes(b[0] - a[0]);
  const h =
    Math.sin(dLatitud / 2) ** 2 +
    Math.cos(aRadianes(a[1])) * Math.cos(aRadianes(b[1])) * Math.sin(dLongitud / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

export function medirRecorrido(linea: Coordenadas[]): Recorrido {
  const acumulado = [0];
  for (let i = 1; i < linea.length; i++) {
    acumulado.push(acumulado[i - 1]! + distanciaEnMetros(linea[i - 1]!, linea[i]!));
  }
  return { linea, acumulado, longitud: acumulado[acumulado.length - 1] ?? 0 };
}

export function duracionSimulacion(longitud: number): number {
  const duracion = (longitud / VELOCIDAD_DEMO_M_S) * 1000;
  return Math.min(DURACION_MAXIMA_MS, Math.max(DURACION_MINIMA_MS, duracion));
}

export function posicionEnRecorrido({ linea, acumulado, longitud }: Recorrido, distancia: number): PosicionSimulada {
  if (linea.length < 2) {
    return { coordenadas: linea[0] ?? [0, 0], haciaElOeste: false };
  }
  const objetivo = Math.max(0, Math.min(longitud, distancia));
  let bajo = 0;
  let alto = linea.length - 1;
  while (alto - bajo > 1) {
    const medio = Math.floor((bajo + alto) / 2);
    if (acumulado[medio]! <= objetivo) bajo = medio;
    else alto = medio;
  }
  const inicio = linea[bajo]!;
  const fin = linea[alto]!;
  const tramo = acumulado[alto]! - acumulado[bajo]!;
  const avance = tramo === 0 ? 0 : (objetivo - acumulado[bajo]!) / tramo;
  return {
    coordenadas: [inicio[0] + (fin[0] - inicio[0]) * avance, inicio[1] + (fin[1] - inicio[1]) * avance],
    haciaElOeste: fin[0] < inicio[0],
  };
}
