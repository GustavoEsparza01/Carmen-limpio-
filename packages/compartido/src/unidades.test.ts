import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contarConfianza, entradasSinUbicar } from './catalogo.ts';
import { UNIDADES } from './unidades.ts';

test('son 8 unidades y la 8 no tiene ruta matutina', () => {
  assert.equal(UNIDADES.length, 8);
  assert.deepEqual(UNIDADES[0], { numero: 1, matutina: 'M1', vespertina: 'V1' });
  assert.deepEqual(UNIDADES[7], { numero: 8, matutina: null, vespertina: 'V8' });
});

test('cada ruta queda asignada a una sola unidad', () => {
  const asignadas = UNIDADES.flatMap((u) => [u.matutina, u.vespertina]).filter(Boolean);
  assert.equal(asignadas.length, 15);
  assert.equal(new Set(asignadas).size, 15);
});

test('conserva los conteos de confianza confirmados', () => {
  assert.deepEqual(contarConfianza(), { alta: 54, media: 31, baja: 12, ninguna: 26 });
});

test('lista las 26 entradas sin ubicar con su ruta', () => {
  const sinUbicar = entradasSinUbicar();
  assert.equal(sinUbicar.length, 26);
  assert.equal(sinUbicar.filter((e) => e.lugar.nombre === 'Renovación VII').length, 2);
  assert.equal(sinUbicar.filter((e) => e.rutaId === 'V5').length, 4);
});
