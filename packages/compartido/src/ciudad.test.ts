import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RUTAS } from './catalogo.ts';
import {
  colorDeRuta,
  COLORES_RUTA,
  LIMITES_CIUDAD,
  rutasDeTurno,
  rutasTocadas,
  TRAZADOS_CIUDAD,
} from './ciudad.ts';
import { TRAZADOS } from './trazado.ts';

function luminancia(color: string) {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro = 0, oscuro = 0] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

test('incluye las 15 rutas con una línea por ruta', () => {
  assert.equal(TRAZADOS_CIUDAD.features.length, 15);
  assert.deepEqual(
    TRAZADOS_CIUDAD.features.map((f) => f.properties.rutaId).sort(),
    RUTAS.map((r) => r.id).sort(),
  );
});

test('solo usa las líneas del escenario carteles', () => {
  for (const { properties, geometry } of TRAZADOS_CIUDAD.features) {
    assert.deepEqual(geometry.coordinates, TRAZADOS[properties.rutaId]?.linea);
  }
});

test('filtra por turno sin perder rutas', () => {
  assert.equal(rutasDeTurno('matutino').length, 7);
  assert.equal(rutasDeTurno('vespertino').length, 8);
  assert.equal(rutasDeTurno(null).length, 15);
});

test('cada número tiene color propio y lo conserva en ambos turnos', () => {
  assert.equal(new Set(COLORES_RUTA).size, 8);
  const colores = new Set(TRAZADOS_CIUDAD.features.map((f) => f.properties.color));
  assert.equal(colores.size, 8);
  assert.equal(colorDeRuta(1), TRAZADOS_CIUDAD.features.find((f) => f.properties.rutaId === 'V1')?.properties.color);
});

test('los colores contrastan 3:1 o más con el mapa claro', () => {
  for (const color of COLORES_RUTA) {
    assert.ok(contraste(color, '#F2F2F2') >= 3, `${color}: ${contraste(color, '#F2F2F2').toFixed(2)}`);
  }
});

test('los límites contienen toda la ciudad', () => {
  const [oeste, sur, este, norte] = LIMITES_CIUDAD;
  for (const { geometry } of TRAZADOS_CIUDAD.features) {
    for (const [longitud, latitud] of geometry.coordinates) {
      assert.ok(longitud >= oeste && longitud <= este && latitud >= sur && latitud <= norte);
    }
  }
});

test('un toque sobre rutas superpuestas las lista una vez cada una', () => {
  const tocadas = rutasTocadas([{ rutaId: 'V2' }, { rutaId: 'M1' }, { rutaId: 'V2' }, null, {}]);
  assert.deepEqual(tocadas, ['M1', 'V2']);
  assert.deepEqual(rutasTocadas([]), []);
});
