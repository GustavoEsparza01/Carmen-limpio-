import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listaDias, textoHorario } from './horario.ts';

test('muestra los tres días con su ventana', () => {
  assert.equal(textoHorario(['martes', 'jueves', 'sabado'], 'matutino'), 'martes, jueves y sábado, 7:00 a 15:00');
});

test('cubre la excepción de dos días de San Joaquín', () => {
  assert.equal(textoHorario(['martes', 'jueves'], 'vespertino'), 'martes y jueves, 15:00 a 23:00');
});

test('cubre la excepción de un solo día de Bivalvo', () => {
  assert.equal(textoHorario(['martes'], 'vespertino'), 'martes, 15:00 a 23:00');
});

test('ordena los días aunque lleguen desordenados', () => {
  assert.equal(listaDias(['sabado', 'martes']), 'martes y sábado');
});
