// Genera el trazado de consulta para las apps. Ejecutar desde herramientas/rutas.
// Solo usa el escenario `carteles`: cobertura.geojson y recorridos.geojson son de `propuesta`.
import { readFileSync, writeFileSync } from 'node:fs';
import { idLugar } from '../../../packages/compartido/src/busqueda.ts';

const leer = (archivo: string) => JSON.parse(readFileSync(archivo, 'utf8'));
const ubicaciones = leer('data/ubicaciones.json');

const claveUbicacion = ({ conf, ...lugar }: Record<string, unknown>) => JSON.stringify(lugar);

interface Parada {
  nombre: string;
  lugarIds: string[];
  coordenadas: number[];
  confianza: string;
}

const trazados: Record<string, { linea: number[][]; paradas: Parada[] }> = {};
for (const f of leer('salida/rutas.geojson').features) {
  // `traslado` es el viaje a la zona de servicio y de regreso: no es recolección.
  if (f.properties.tramo === 'servicio') {
    trazados[f.properties.ruta] = { linea: f.geometry.coordinates, paradas: [] };
  }
}

const puntos = leer('salida/paradas.geojson').features;
for (const f of puntos) {
  const { ruta, lugar, confianza } = f.properties;
  const trazado = trazados[ruta];
  if (!trazado) throw new Error(`Parada sin trazado: ${ruta} ${lugar}`);
  trazado.paradas.push({ nombre: lugar, lugarIds: [idLugar(lugar)], coordenadas: f.geometry.coordinates, confianza });
}

// El trazador guarda un punto por nodo: los lugares con la misma ubicación se quedan sin punto propio.
let compartidos = 0;
for (const [ruta, { paradas }] of Object.entries(trazados)) {
  const lugares = Object.entries<Record<string, unknown>>(ubicaciones[ruta]);
  for (const [nombre, ubicacion] of lugares) {
    if (ubicacion.conf === 'ninguna' || paradas.some((p) => p.nombre === nombre)) continue;
    const clave = claveUbicacion(ubicacion);
    const hermano = lugares.find(([n, u]) => claveUbicacion(u) === clave && paradas.some((p) => p.nombre === n));
    if (!hermano) throw new Error(`Lugar ubicado sin punto: ${ruta} ${nombre}`);
    for (const parada of paradas) {
      if (parada.nombre === hermano[0]) parada.lugarIds.push(idLugar(nombre));
    }
    compartidos += 1;
  }
}

const salida = Object.fromEntries(
  Object.entries(trazados).map(([ruta, { linea, paradas }]) => [
    ruta,
    { linea, paradas: paradas.map(({ nombre, ...parada }) => parada) },
  ]),
);

writeFileSync(
  '../../packages/compartido/src/trazado.generado.ts',
  `// Generado por herramientas/rutas/scripts/generar-trazado.ts. No editar a mano.
import type { Trazado } from './trazado.ts';

export const TRAZADOS: Record<string, Trazado> = ${JSON.stringify(salida)};
`,
);
console.log(`rutas ${Object.keys(salida).length}, puntos ${puntos.length}, lugares que comparten punto ${compartidos}`);
