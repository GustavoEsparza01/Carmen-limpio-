import type { Ruta } from './catalogo.ts';
import { medirRecorrido } from './simulacion.ts';
import { lugaresUbicados, trazadoDeRuta, type Coordenadas } from './trazado.ts';

// Silueta decorativa del trazado `carteles`: identifica la ruta, no indica sentido ni orden.

// Con menos que esto la forma diría más de lo que sabemos (por ejemplo, la V5).
const LONGITUD_MINIMA_M = 1_000;
const LUGARES_MINIMOS = 2;
const PUNTOS_MAXIMOS = 40;
const TOLERANCIA_INICIAL = 0.008;

type Punto = [x: number, y: number];

export interface Segmento {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  largo: number;
  angulo: number;
}

// Proyección local: un grado de longitud mide menos que uno de latitud, y en pantalla la y crece hacia abajo.
function proyectar(linea: readonly Coordenadas[]): Punto[] {
  const latitudMedia = (linea.reduce((suma, [, latitud]) => suma + latitud, 0) / linea.length) * (Math.PI / 180);
  return linea.map(([longitud, latitud]) => [longitud * Math.cos(latitudMedia), -latitud]);
}

function distanciaASegmento([px, py]: Punto, [ax, ay]: Punto, [bx, by]: Punto): number {
  const dx = bx - ax;
  const dy = by - ay;
  const cuadrado = dx * dx + dy * dy;
  const t = cuadrado === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / cuadrado));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Douglas-Peucker: conserva las curvas que dan forma a la ruta.
function simplificar(puntos: readonly Punto[], tolerancia: number): Punto[] {
  const conservar = new Set([0, puntos.length - 1]);
  const pendientes: [number, number][] = [[0, puntos.length - 1]];
  while (pendientes.length > 0) {
    const [inicio, fin] = pendientes.pop()!;
    let mayor = 0;
    let indice = -1;
    for (let i = inicio + 1; i < fin; i++) {
      const distancia = distanciaASegmento(puntos[i]!, puntos[inicio]!, puntos[fin]!);
      if (distancia > mayor) {
        mayor = distancia;
        indice = i;
      }
    }
    if (indice !== -1 && mayor > tolerancia) {
      conservar.add(indice);
      pendientes.push([inicio, indice], [indice, fin]);
    }
  }
  return [...conservar].sort((a, b) => a - b).map((i) => puntos[i]!);
}

function aCajaUnitaria(puntos: readonly Punto[]): Punto[] {
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const escala = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  return puntos.map(([x, y]) => [(x - minX) / escala, (y - minY) / escala]);
}

function encajar(puntos: readonly Punto[], ancho: number, alto: number, margen: number): Punto[] {
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  const anchoForma = Math.max(...xs);
  const altoForma = Math.max(...ys);
  const escala = Math.min((ancho - margen * 2) / (anchoForma || 1), (alto - margen * 2) / (altoForma || 1));
  const desplazaX = (ancho - anchoForma * escala) / 2;
  const desplazaY = (alto - altoForma * escala) / 2;
  return puntos.map(([x, y]) => [x * escala + desplazaX, y * escala + desplazaY]);
}

export function tieneSilueta(ruta: Pick<Ruta, 'id'>): boolean {
  const trazado = trazadoDeRuta(ruta.id);
  if (!trazado) return false;
  return (
    lugaresUbicados(trazado) >= LUGARES_MINIMOS && medirRecorrido(trazado.linea).longitud >= LONGITUD_MINIMA_M
  );
}

// Null si la ruta no tiene geometría suficiente para una forma honesta.
export function siluetaDeRuta(ruta: Pick<Ruta, 'id'>, ancho: number, alto: number, margen = 4): Segmento[] | null {
  const trazado = trazadoDeRuta(ruta.id);
  if (!trazado || !tieneSilueta(ruta)) return null;

  const unitarios = aCajaUnitaria(proyectar(trazado.linea));
  let tolerancia = TOLERANCIA_INICIAL;
  let simplificados = simplificar(unitarios, tolerancia);
  while (simplificados.length > PUNTOS_MAXIMOS) {
    tolerancia *= 1.3;
    simplificados = simplificar(unitarios, tolerancia);
  }

  const puntos = encajar(simplificados, ancho, alto, margen);
  return puntos.slice(1).map(([x2, y2], i) => {
    const [x1, y1] = puntos[i]!;
    return { x1, y1, x2, y2, largo: Math.hypot(x2 - x1, y2 - y1), angulo: Math.atan2(y2 - y1, x2 - x1) };
  });
}
