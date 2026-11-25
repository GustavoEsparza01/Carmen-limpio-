import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lugaresEnTexto, responderHorario } from './asistente.ts';
import { LUGARES, lugarPorId } from './catalogo.ts';

// El 10 de noviembre de 2026 es martes; Mérida está en UTC-6.
const martes = new Date('2026-11-10T10:00:00-06:00');
const nombres = (texto: string) => lugaresEnTexto(texto).map((l) => l.nombre);
const responder = (texto: string, guardado?: string) =>
  responderHorario(texto, martes, guardado ? lugarPorId(guardado) : undefined);

test('cada lugar del catálogo se reconoce por su nombre', () => {
  for (const { nombre } of LUGARES) {
    const pregunta = /^\d+$/.test(nombre) ? `¿Cuándo pasa por la ${nombre}?` : `¿Cuándo pasa por ${nombre}?`;
    assert.ok(nombres(pregunta).includes(nombre), nombre);
  }
});

test('tolera acentos, mayúsculas y faltas comunes', () => {
  assert.deepEqual(nombres('cuando pasa en BIBALVO'), ['Bivalvo']);
  assert.deepEqual(nombres('horario de san nicolas'), ['San Nicolás']);
});

test('gana el nombre más largo', () => {
  assert.deepEqual(nombres('¿Cuándo pasa por Ampliación San Nicolás?'), ['Ampliación San Nicolás']);
  assert.deepEqual(nombres('¿Cuándo pasa por Renovación 2?'), ['Renovación 2']);
});

test('sin número de sección ofrece todas', () => {
  assert.equal(nombres('¿Cuándo pasa por Renovación?').length, 4);
  assert.match(responder('¿Cuándo pasa por Renovación?')!.texto, /¿Cuál es el tuyo\?/);
});

test('un número suelto no es una colonia', () => {
  assert.deepEqual(nombres('¿pasa el 25 de diciembre?'), []);
  assert.deepEqual(nombres('¿pasa por la 25?'), ['25']);
});

test('da días y ventana, no hora de llegada, y cita la fuente', () => {
  const r = responder('¿Qué días pasa por San Manuel?');
  assert.equal(r?.lugarId, lugaresEnTexto('San Manuel')[0]?.id);
  assert.match(r!.texto, /martes, jueves y sábado, 7:00 a 15:00/);
  assert.match(r!.texto, /Según carteles públicos/);
});

test('un lugar en dos rutas muestra las dos', () => {
  assert.equal(responder('¿Cuándo pasa por Bivalvo?')!.texto.match(/\(ruta/g)?.length, 2);
});

test('marca lo que está por confirmar', () => {
  assert.match(responder('horario de Renovación VII')!.texto, /Por confirmar/);
});

test('"mi colonia" usa el lugar guardado', () => {
  const { id, nombre } = lugaresEnTexto('San Manuel')[0]!;
  assert.ok(responder('¿Hoy pasa por mi colonia?', id)!.texto.startsWith(nombre));
  assert.match(responder('¿Hoy pasa por mi colonia?')!.texto, /Aún no guardas/);
});

test('quejas y otros temas van a la IA', () => {
  for (const p of [
    'No pasó el camión por Bivalvo',
    '¿Cómo reporto que no pasa en San Manuel?',
    '¿Hay avisos de Bivalvo?',
    '¿Qué es Carmen Limpio?',
    '¿Cuándo pasa por Colonia Inventada?',
  ]) {
    assert.equal(responder(p), null, p);
  }
});
