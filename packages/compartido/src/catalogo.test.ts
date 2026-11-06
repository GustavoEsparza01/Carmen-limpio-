import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buscarLugares, LUGARES, lugarPorId, tieneMapa } from './catalogo.ts';
import { textoHorario } from './horario.ts';

const nombres = (consulta: string) => buscarLugares(consulta).map((l) => l.nombre);

function lugar(nombre: string) {
  const encontrado = LUGARES.find((l) => l.nombre === nombre);
  assert.ok(encontrado, nombre);
  return encontrado;
}

test('conserva las 123 entradas y las 15 rutas de los carteles', () => {
  const horarios = LUGARES.flatMap((l) => l.horarios);
  assert.equal(horarios.length, 123);
  assert.equal(new Set(horarios.map((h) => h.rutaId)).size, 15);
});

test('los identificadores no se repiten', () => {
  assert.equal(new Set(LUGARES.map((l) => l.id)).size, LUGARES.length);
});

test('encuentra Renovación 1 con y sin acento', () => {
  assert.ok(nombres('Renovación 1').includes('Renovación 1'));
  assert.ok(nombres('renovacion 1').includes('Renovación 1'));
});

test('muestra la ventana de Renovación 1', () => {
  const [h] = lugar('Renovación 1').horarios;
  assert.ok(h);
  assert.equal(textoHorario(h.dias, h.turno), 'martes, jueves y sábado, 15:00 a 23:00');
});

test('entiende abreviaturas y números romanos', () => {
  assert.ok(nombres('fraccionamiento lagos').includes('Frac. Lagos'));
  assert.ok(nombres('av nardos').includes('Avenida Nardos'));
  assert.ok(nombres('renovacion 7').includes('Renovación VII'));
});

test('une Avenida Nardos y Av. Nardos conservando sus dos rutas', () => {
  assert.deepEqual(
    lugar('Avenida Nardos').horarios.map((h) => h.rutaId),
    ['M2', 'M4'],
  );
});

test('tolera la escritura "Bivalbo" del cartel', () => {
  assert.deepEqual(nombres('bivalbo'), ['Bivalvo']);
});

test('una consulta vacía no devuelve resultados', () => {
  assert.deepEqual(buscarLugares('   '), []);
});

test('un lugar sin ubicar conserva su horario y no tiene mapa', () => {
  const potrero = lugar('Potrero 1');
  assert.equal(tieneMapa(potrero), false);
  const [h] = potrero.horarios;
  assert.ok(h);
  assert.equal(textoHorario(h.dias, h.turno), 'martes, jueves y sábado, 7:00 a 15:00');
});

test('San Joaquín solo tiene martes y jueves', () => {
  const [h] = lugar('Frac. San Joaquín').horarios;
  assert.deepEqual(h?.dias, ['martes', 'jueves']);
});

test('Bivalvo reparte sus días entre dos rutas', () => {
  const horarios = lugar('Bivalvo').horarios;
  assert.deepEqual(
    horarios.map((h) => [h.rutaId, h.dias]),
    [
      ['V2', ['martes']],
      ['V3', ['jueves', 'sabado']],
    ],
  );
});

test('Renovación VII marca como por confirmar solo la deducción de V1', () => {
  const horarios = lugar('Renovación VII').horarios;
  assert.deepEqual(
    horarios.map((h) => [h.rutaId, h.porConfirmar]),
    [
      ['V1', true],
      ['V7', false],
    ],
  );
});

test('busca un lugar por su identificador', () => {
  assert.equal(lugarPorId('bivalvo')?.nombre, 'Bivalvo');
  assert.equal(lugarPorId('no-existe'), undefined);
});
