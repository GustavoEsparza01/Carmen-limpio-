import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  distanciaEnMetros,
  duracionSimulacion,
  interpolar,
  medirRecorrido,
  posicionEnRecorrido,
  puntoDesdeEwkb,
  puntoDesdeGeometria,
} from './simulacion.ts';
import { TRAZADOS, type Coordenadas } from './trazado.ts';

const LINEA: Coordenadas[] = [
  [-91.8, 18.65],
  [-91.79, 18.65],
  [-91.79, 18.66],
];

test('mide la distancia acumulada del recorrido', () => {
  const recorrido = medirRecorrido(LINEA);
  assert.equal(recorrido.acumulado[0], 0);
  assert.ok(Math.abs(recorrido.longitud - 2166) < 15);
});

test('empieza y termina en los extremos, y no se sale de la línea', () => {
  const recorrido = medirRecorrido(LINEA);
  assert.deepEqual(posicionEnRecorrido(recorrido, 0).coordenadas, LINEA[0]);
  assert.deepEqual(posicionEnRecorrido(recorrido, recorrido.longitud).coordenadas, LINEA[2]);
  assert.deepEqual(posicionEnRecorrido(recorrido, -50).coordenadas, LINEA[0]);
  assert.deepEqual(posicionEnRecorrido(recorrido, recorrido.longitud + 50).coordenadas, LINEA[2]);
});

test('interpola dentro de un tramo y conoce la dirección', () => {
  const recorrido = medirRecorrido(LINEA);
  const mitad = posicionEnRecorrido(recorrido, recorrido.acumulado[1]! / 2);
  assert.ok(Math.abs(mitad.coordenadas[0] - -91.795) < 1e-9);
  assert.equal(mitad.haciaElOeste, false);
  const inversa = medirRecorrido([...LINEA].reverse());
  assert.equal(posicionEnRecorrido(inversa, inversa.longitud - 10).haciaElOeste, true);
});

test('tolera líneas vacías, de un punto y con puntos repetidos', () => {
  assert.deepEqual(posicionEnRecorrido(medirRecorrido([]), 10).coordenadas, [0, 0]);
  assert.deepEqual(posicionEnRecorrido(medirRecorrido([LINEA[0]!]), 10).coordenadas, LINEA[0]);
  const repetida = medirRecorrido([LINEA[0]!, LINEA[0]!, LINEA[1]!]);
  assert.ok(Number.isFinite(posicionEnRecorrido(repetida, 0).coordenadas[0]));
});

test('la duración siempre queda entre 20 segundos y 2 minutos', () => {
  assert.equal(duracionSimulacion(0), 20_000);
  assert.equal(duracionSimulacion(6_000), 40_000);
  assert.equal(duracionSimulacion(100_000), 120_000);
});

test('en todas las rutas avanza sin saltos mayores al paso', () => {
  for (const [id, trazado] of Object.entries(TRAZADOS)) {
    const recorrido = medirRecorrido(trazado.linea);
    const pasos = 500;
    const paso = recorrido.longitud / pasos;
    let anterior = posicionEnRecorrido(recorrido, 0).coordenadas;
    for (let i = 1; i <= pasos; i++) {
      const actual = posicionEnRecorrido(recorrido, paso * i).coordenadas;
      assert.ok(distanciaEnMetros(anterior, actual) <= paso + 1, `salto en ${id}`);
      anterior = actual;
    }
  }
});

test('lee el punto que entrega Supabase en EWKB', () => {
  // SRID=4326;POINT(-91.8 18.65), tal como lo devuelve PostgREST.
  const hex = '0101000020E61000003333333333F356C06666666666A63240';
  const punto = puntoDesdeEwkb(hex)!;
  assert.ok(Math.abs(punto[0] + 91.8) < 1e-9 && Math.abs(punto[1] - 18.65) < 1e-9);
  assert.equal(puntoDesdeEwkb('no es hex'), null);
  assert.equal(puntoDesdeEwkb('0102000020E6100000'), null);
});

test('entre dos posiciones avanza en línea recta', () => {
  assert.deepEqual(interpolar([0, 0], [10, 20], 0.5), [5, 10]);
  assert.deepEqual(interpolar([0, 0], [10, 20], 2), [10, 20]);
});

test('lee el punto en GeoJSON (REST) o en EWKB (tiempo real)', () => {
  const geojson = { type: 'Point', crs: { type: 'name' }, coordinates: [-91.77, 18.65] };
  assert.deepEqual(puntoDesdeGeometria(geojson), [-91.77, 18.65]);
  assert.ok(puntoDesdeGeometria('0101000020E61000003333333333F356C06666666666A63240'));
  assert.equal(puntoDesdeGeometria({ type: 'LineString', coordinates: [] }), null);
  assert.equal(puntoDesdeGeometria(null), null);
});
