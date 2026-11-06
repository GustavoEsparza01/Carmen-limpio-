import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { lugarPorId, RUTAS, rutaPorId } from './catalogo.ts';
import { limitesDe, lugaresUbicados, paradasDeLugar, TRAZADOS, trazadoDeRuta } from './trazado.ts';

const rutasGeojson = JSON.parse(
  readFileSync(new URL('../../../herramientas/rutas/salida/rutas.geojson', import.meta.url), 'utf8'),
);

function trazado(rutaId: string) {
  const encontrado = trazadoDeRuta(rutaId);
  assert.ok(encontrado, rutaId);
  return encontrado;
}

test('las 15 rutas tienen trazado y conservan los 132 puntos', () => {
  assert.deepEqual(Object.keys(TRAZADOS).sort(), RUTAS.map((r) => r.id).sort());
  assert.equal(Object.values(TRAZADOS).flatMap((t) => t.paradas).length, 132);
});

test('cada línea es el tramo de servicio de carteles, no el traslado', () => {
  for (const [id, { linea }] of Object.entries(TRAZADOS)) {
    const servicio = rutasGeojson.features.find(
      (f: any) => f.properties.ruta === id && f.properties.tramo === 'servicio',
    );
    assert.deepEqual(linea, servicio.geometry.coordinates, id);
  }
});

test('cada punto pertenece a lugares de esa ruta y nunca a uno sin ubicar', () => {
  for (const [id, { paradas }] of Object.entries(TRAZADOS)) {
    for (const lugarId of paradas.flatMap((p) => p.lugarIds)) {
      assert.ok(lugarPorId(lugarId), `${id} ${lugarId}`);
      const parada = rutaPorId(id)?.paradas.find((p) => p.lugar.id === lugarId);
      assert.ok(parada, `${id} ${lugarId}`);
      assert.notEqual(parada.horario.confianza, 'ninguna', `${id} ${lugarId}`);
    }
  }
});

test('todo lugar con ubicación tiene un punto en su ruta', () => {
  for (const ruta of RUTAS) {
    const ubicados = ruta.paradas.filter((p) => p.horario.confianza !== 'ninguna');
    assert.equal(lugaresUbicados(trazado(ruta.id)), ubicados.length, ruta.id);
  }
});

test('los lugares con la misma ubicación comparten punto', () => {
  const [arcos] = paradasDeLugar(trazado('M4'), 'los-arcos-2');
  assert.ok(arcos);
  assert.deepEqual(arcos.lugarIds, ['los-arcos-1', 'los-arcos-2']);
  assert.equal(paradasDeLugar(trazado('V7'), 'santa-rita-3')[0]?.lugarIds.length, 3);
});

test('San Joaquín comparte punto aunque sus días sean distintos', () => {
  const ruta = rutaPorId('V1');
  assert.ok(ruta);
  const [punto] = paradasDeLugar(trazado('V1'), 'privada-san-joaquin');
  assert.ok(punto);
  const dias = punto.lugarIds.map((id) => ruta.paradas.find((p) => p.lugar.id === id)?.horario.dias.length);
  assert.deepEqual(dias.sort(), [2, 3]);
});

test('un lugar lineal cuenta como uno aunque tenga dos puntos', () => {
  assert.equal(lugaresUbicados(trazado('M1')), 2);
  assert.ok(trazado('M1').paradas.length > 2);
});

test('un lugar sin ubicar no tiene puntos', () => {
  assert.deepEqual(paradasDeLugar(trazado('V1'), 'renovacion-7'), []);
  assert.ok(lugarPorId('renovacion-7'));
});

test('los límites encierran la ruta en Ciudad del Carmen', () => {
  const [oeste, sur, este, norte] = limitesDe(trazado('M1'));
  assert.ok(oeste < este && sur < norte);
  assert.ok(oeste > -92 && este < -91.5 && sur > 18.5 && norte < 18.8);
});
