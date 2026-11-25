import assert from 'node:assert/strict';
import { test } from 'node:test';
import { elegirVoz, lugaresEnTexto, PREGUNTAS_SUGERIDAS, responderHorario, siguientesPreguntas, textoParaVoz } from './asistente.ts';
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
  assert.equal(responder('¿Cuándo pasa por Renovación?')!.lugarIds, undefined);
  // Cada opción, tocada tal cual, debe llevar a un solo lugar.
  for (const opcion of responder('¿Cuándo pasa por Renovación?')!.opciones!) {
    assert.equal(responder(opcion)?.lugarIds?.length, 1, opcion);
  }
  assert.equal(responder('¿Cuándo pasa por Santa Rita?')!.lugarIds?.length, 3);
});

test('un número suelto no es una colonia', () => {
  assert.deepEqual(nombres('¿pasa el 25 de diciembre?'), []);
  assert.deepEqual(nombres('¿pasa por la 25?'), ['25']);
});

test('da días y ventana, no hora de llegada, y cita la fuente', () => {
  const r = responder('¿Qué días pasa por San Manuel?');
  assert.deepEqual(r?.lugarIds, [lugaresEnTexto('San Manuel')[0]?.id]);
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

test('en voz alta las horas y abreviaturas se dicen completas', () => {
  assert.equal(
    textoParaVoz('Frac. Dorado: martes, 7:00 a 15:00 (ruta 2, turno matutino).\nAbierta hasta las 23:00.'),
    'Fraccionamiento Dorado: martes, 7 de la mañana a 3 de la tarde, ruta 2, turno matutino. Abierta hasta las 11 de la noche.',
  );
  assert.equal(textoParaVoz('12:30 en la ruta M2'), '12 y 30 del día en la ruta M 2');
});

test('elige una voz en español, de preferencia de México y sin conexión', () => {
  const voz = (identifier: string, language: string) => ({ identifier, language });
  const es = voz('es-es-x-local', 'es-ES');
  const us = voz('es-us-x-local', 'es-US');
  const usRed = voz('es-us-a-network', 'es-US');
  const ingles = voz('en-us-x-local', 'en-US');
  assert.equal(elegirVoz([ingles, es, usRed, us]), us);
  assert.equal(elegirVoz([es, usRed]), usRed);
  assert.equal(elegirVoz([us, voz('mx', 'es-MX')])?.identifier, 'mx');
  assert.equal(elegirVoz([ingles, voz('est', 'est-EE')]), undefined);
});

test('las sugerencias no se repiten y, si la IA falló, se contestan sin ella', () => {
  const [primera, segunda, tercera] = PREGUNTAS_SUGERIDAS;
  assert.deepEqual(siguientesPreguntas([segunda!], false), [primera, tercera]);
  assert.deepEqual(siguientesPreguntas(PREGUNTAS_SUGERIDAS, false), []);
  const [local] = siguientesPreguntas(PREGUNTAS_SUGERIDAS, true);
  assert.ok(responder(local!));
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
