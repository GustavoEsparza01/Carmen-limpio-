import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { diasDeRuta, paradasDelDia, RUTAS, rutaPorId, type Ruta } from './catalogo.ts';
import { notaExcepcion } from './horario.ts';

function ruta(id: string) {
  const encontrada = rutaPorId(id);
  assert.ok(encontrada, id);
  return encontrada;
}

function parada(rutaId: string, nombre: string) {
  const encontrada = ruta(rutaId).paradas.find((p) => p.lugar.nombre === nombre);
  assert.ok(encontrada, `${rutaId} ${nombre}`);
  return encontrada;
}

test('hay 7 rutas matutinas y 8 vespertinas, en orden', () => {
  assert.deepEqual(
    RUTAS.map((r) => r.id),
    ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'],
  );
});

test('cada ruta tiene los mismos lugares que los carteles', () => {
  const carteles = JSON.parse(
    readFileSync(new URL('../../../herramientas/rutas/data/rutas.json', import.meta.url), 'utf8'),
  );
  for (const { id, turno, numero, lugares } of carteles.rutas) {
    const r = ruta(id);
    assert.equal(r.paradas.length, lugares.length, id);
    assert.equal(r.turno, turno, id);
    assert.equal(r.numero, numero, id);
  }
});

test('la ruta 1 de cada turno es un recorrido distinto', () => {
  const matutina = ruta('M1').paradas.map((p) => p.lugar.id);
  const vespertina = ruta('V1').paradas.map((p) => p.lugar.id);
  assert.ok(matutina.every((id) => !vespertina.includes(id)));
});

test('las excepciones de días aparecen dentro de su ruta', () => {
  assert.equal(notaExcepcion(parada('V1', 'Frac. San Joaquín').horario.dias), 'Solo martes y jueves');
  assert.equal(notaExcepcion(parada('V2', 'Bivalvo').horario.dias), 'Solo martes');
  assert.equal(notaExcepcion(parada('V3', 'Bivalvo').horario.dias), 'Solo jueves y sábado');
  assert.equal(notaExcepcion(parada('V3', 'Renovación 1').horario.dias), null);
});

test('Renovación VII solo queda por confirmar en V1', () => {
  assert.equal(parada('V1', 'Renovación VII').horario.porConfirmar, true);
  assert.equal(parada('V7', 'Renovación VII').horario.porConfirmar, false);
});

test('una ruta inexistente no se resuelve', () => {
  assert.equal(rutaPorId('M8'), undefined);
});

test('el filtro por día respeta las excepciones de cada lugar', () => {
  const v1 = ruta('V1');
  const nombres = (dia: 'martes' | 'jueves' | 'sabado') => paradasDelDia(v1, dia).map((p) => p.lugar.nombre);
  assert.equal(paradasDelDia(v1, null).length, 16);
  assert.ok(!nombres('sabado').includes('Frac. San Joaquín'));
  assert.ok(nombres('jueves').includes('Frac. San Joaquín'));
  assert.ok(!nombres('martes').includes('Renovación VII'));
  assert.ok(nombres('sabado').includes('Renovación VII'));
  assert.ok(!paradasDelDia(ruta('V2'), 'jueves').some((p) => p.lugar.nombre === 'Bivalvo'));
  assert.ok(paradasDelDia(ruta('V3'), 'jueves').some((p) => p.lugar.nombre === 'Bivalvo'));
});

test('los filtros de día salen de los días reales de la ruta', () => {
  for (const ruta of RUTAS) assert.ok(diasDeRuta(ruta).length > 0, ruta.id);
  const conViernes: Ruta = {
    ...rutaPorId('V2')!,
    paradas: rutaPorId('V2')!.paradas.map((p, i) =>
      i === 0 ? { ...p, horario: { ...p.horario, dias: ['martes', 'viernes'] } } : p,
    ),
  };
  assert.ok(diasDeRuta(conViernes).includes('viernes'));
});
