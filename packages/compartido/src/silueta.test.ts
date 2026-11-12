import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RUTAS } from './catalogo.ts';
import { siluetaDeRuta, tieneSilueta } from './silueta.ts';

const ANCHO = 120;
const ALTO = 84;
const CON_SILUETA = RUTAS.filter((r) => r.id !== 'V5');

test('la V5 no tiene geometría suficiente y las demás sí', () => {
  assert.equal(tieneSilueta({ id: 'V5' }), false);
  assert.equal(siluetaDeRuta({ id: 'V5' }, ANCHO, ALTO), null);
  for (const ruta of CON_SILUETA) assert.equal(tieneSilueta(ruta), true, ruta.id);
});

test('una ruta desconocida no tiene silueta', () => {
  assert.equal(tieneSilueta({ id: 'X9' }), false);
  assert.equal(siluetaDeRuta({ id: 'X9' }, ANCHO, ALTO), null);
});

test('toda silueta cabe en la caja, respeta el margen y no da valores inválidos', () => {
  for (const ruta of CON_SILUETA) {
    const segmentos = siluetaDeRuta(ruta, ANCHO, ALTO, 4)!;
    assert.ok(segmentos.length > 0, ruta.id);
    for (const { x1, y1, x2, y2, largo, angulo } of segmentos) {
      for (const v of [x1, y1, x2, y2, largo, angulo]) assert.ok(Number.isFinite(v), ruta.id);
      for (const x of [x1, x2]) assert.ok(x >= 3.99 && x <= ANCHO - 3.99, `${ruta.id} x=${x}`);
      for (const y of [y1, y2]) assert.ok(y >= 3.99 && y <= ALTO - 3.99, `${ruta.id} y=${y}`);
    }
  }
});

test('la línea es continua: cada segmento empieza donde acabó el anterior', () => {
  for (const ruta of CON_SILUETA) {
    const segmentos = siluetaDeRuta(ruta, ANCHO, ALTO)!;
    for (let i = 1; i < segmentos.length; i++) {
      assert.equal(segmentos[i]!.x1, segmentos[i - 1]!.x2, ruta.id);
      assert.equal(segmentos[i]!.y1, segmentos[i - 1]!.y2, ruta.id);
    }
  }
});

test('se simplifica para no dibujar cientos de piezas, aun en la ruta más larga', () => {
  for (const ruta of CON_SILUETA) {
    assert.ok(siluetaDeRuta(ruta, ANCHO, ALTO)!.length < 40, ruta.id);
  }
});

test('conserva la forma: las rutas no se reducen a una recta', () => {
  for (const ruta of CON_SILUETA) {
    assert.ok(siluetaDeRuta(ruta, ANCHO, ALTO)!.length >= 3, ruta.id);
  }
});

test('el mismo tamaño da siempre la misma silueta', () => {
  assert.deepEqual(siluetaDeRuta({ id: 'M1' }, ANCHO, ALTO), siluetaDeRuta({ id: 'M1' }, ANCHO, ALTO));
});

test('respeta la proporción real: una ruta alargada no se estira', () => {
  const segmentos = siluetaDeRuta({ id: 'M1' }, ANCHO, ALTO, 4)!;
  const xs = segmentos.flatMap((s) => [s.x1, s.x2]);
  const ys = segmentos.flatMap((s) => [s.y1, s.y2]);
  const anchoForma = Math.max(...xs) - Math.min(...xs);
  const altoForma = Math.max(...ys) - Math.min(...ys);
  // M1 mide unos 2.3 × 0.7 km.
  assert.ok(anchoForma / altoForma > 2.4 && anchoForma / altoForma < 4, `${anchoForma / altoForma}`);
});
