import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lugarPorId } from './catalogo.ts';
import { cambiarRecordatorio, guardarLugar, migrarGuardados, quitarLugar, type LugarGuardado } from './guardados.ts';
import { avisosDeLugar, avisosProgramados, textoCompartir } from './recordatorios.ts';

const merida = (fecha: string) => new Date(`${fecha}-06:00`);
const lugar = (id: string) => lugarPorId(id)!;
const CASA: LugarGuardado = { lugarId: 'bivalvo', etiqueta: 'casa', recordatorio: 'ninguno' };

test('migra el lugar guardado anterior sin perderlo', () => {
  assert.deepEqual(migrarGuardados(null, 'bivalvo'), [CASA]);
});

test('una instalación nueva empieza sin lugares', () => {
  assert.deepEqual(migrarGuardados(null, null), []);
});

test('el formato nuevo tiene prioridad sobre el anterior', () => {
  const nuevo = JSON.stringify([{ lugarId: 'avenida-nardos', etiqueta: 'trabajo', recordatorio: 'nocheAnterior' }]);
  assert.equal(migrarGuardados(nuevo, 'bivalvo')[0]?.lugarId, 'avenida-nardos');
});

test('datos dañados no rompen la app ni pierden el lugar anterior', () => {
  assert.deepEqual(migrarGuardados('{no es json', 'bivalvo'), [CASA]);
  assert.deepEqual(migrarGuardados('[{"lugarId":3}]', null), []);
  assert.deepEqual(migrarGuardados('null', 'bivalvo'), [CASA]);
});

test('guardar no duplica: cambia la etiqueta y conserva el recordatorio', () => {
  const lista = [{ ...CASA, recordatorio: 'nocheAnterior' as const }];
  assert.deepEqual(guardarLugar(lista, 'bivalvo', 'trabajo'), [{ ...lista[0]!, etiqueta: 'trabajo' }]);
  assert.equal(guardarLugar(lista, 'renovacion-7', 'otro').length, 2);
});

test('quitar y cambiar el recordatorio solo afecta a ese lugar', () => {
  const lista = guardarLugar([CASA], 'renovacion-7', 'trabajo');
  assert.deepEqual(quitarLugar(lista, 'bivalvo').map((g) => g.lugarId), ['renovacion-7']);
  const cambiada = cambiarRecordatorio(lista, 'bivalvo', 'antesDeVentana');
  assert.equal(cambiada[0]?.recordatorio, 'antesDeVentana');
  assert.equal(cambiada[1]?.recordatorio, 'ninguno');
});

test('la noche anterior avisa a las 20:00 de Mérida', () => {
  const [aviso] = avisosDeLugar(lugar('bivalvo'), 'nocheAnterior', merida('2026-11-09T10:00:00'));
  assert.equal(aviso?.fecha.toISOString(), merida('2026-11-09T20:00:00').toISOString());
  assert.equal(aviso?.titulo, 'Mañana es día de recolección en Bivalvo');
});

test('antes de la ventana avisa una hora antes de que abra', () => {
  const [aviso] = avisosDeLugar(lugar('bivalvo'), 'antesDeVentana', merida('2026-11-10T08:00:00'));
  assert.equal(aviso?.fecha.toISOString(), merida('2026-11-10T14:00:00').toISOString());
  assert.equal(aviso?.titulo, 'Hoy es día de recolección en Bivalvo');
});

test('no programa fechas pasadas', () => {
  const ahora = merida('2026-11-10T14:30:00');
  for (const aviso of avisosDeLugar(lugar('bivalvo'), 'antesDeVentana', ahora)) {
    assert.ok(aviso.fecha > ahora);
  }
  const [primero] = avisosDeLugar(lugar('bivalvo'), 'antesDeVentana', ahora);
  assert.equal(primero?.fecha.toISOString(), merida('2026-11-12T14:00:00').toISOString());
});

test('sin recordatorio no programa nada', () => {
  assert.deepEqual(avisosDeLugar(lugar('bivalvo'), 'ninguno', merida('2026-11-09T10:00:00')), []);
});

test('dos rutas en la misma ventana dan un solo aviso', () => {
  const avisos = avisosDeLugar(lugar('avenida-nardos'), 'nocheAnterior', merida('2026-11-09T10:00:00'));
  const fechas = avisos.map((a) => a.fecha.getTime());
  assert.equal(new Set(fechas).size, fechas.length);
});

test('no hay ids repetidos y son estables al reprogramar el mismo día', () => {
  const guardados: LugarGuardado[] = [
    { lugarId: 'bivalvo', etiqueta: 'casa', recordatorio: 'nocheAnterior' },
    { lugarId: 'avenida-nardos', etiqueta: 'trabajo', recordatorio: 'antesDeVentana' },
  ];
  const a = avisosProgramados(guardados, merida('2026-11-09T10:00:00'));
  const b = avisosProgramados(guardados, merida('2026-11-09T10:05:00'));
  assert.equal(new Set(a.map((x) => x.id)).size, a.length);
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
});

test('funciona igual con el teléfono en otra zona horaria', () => {
  const original = process.env.TZ;
  const ahora = merida('2026-11-09T10:00:00');
  try {
    process.env.TZ = 'Asia/Tokyo';
    const [aviso] = avisosDeLugar(lugar('bivalvo'), 'nocheAnterior', ahora);
    assert.equal(aviso?.fecha.toISOString(), merida('2026-11-09T20:00:00').toISOString());
  } finally {
    process.env.TZ = original;
  }
});

test('marca por confirmar en el aviso de la ventana deducida', () => {
  const avisos = avisosDeLugar(lugar('renovacion-7'), 'nocheAnterior', merida('2026-11-09T10:00:00'));
  const martes = avisos.find((a) => a.fecha.getTime() === merida('2026-11-09T20:00:00').getTime());
  const jueves = avisos.find((a) => a.fecha.getTime() === merida('2026-11-11T20:00:00').getTime());
  assert.doesNotMatch(martes?.cuerpo ?? '', /Por confirmar/);
  assert.match(jueves?.cuerpo ?? '', /Por confirmar/);
});

test('los avisos no afirman que el camión pase ni dan hora de llegada', () => {
  for (const id of ['bivalvo', 'avenida-nardos', 'renovacion-7']) {
    for (const aviso of avisosDeLugar(lugar(id), 'antesDeVentana', merida('2026-11-09T10:00:00'))) {
      assert.doesNotMatch(`${aviso.titulo} ${aviso.cuerpo}`, /llega|pasará|pasa |camión/i);
      assert.match(aviso.cuerpo, /Ventana de/);
    }
  }
});

test('compartir incluye las ventanas y aclara que no es oficial', () => {
  const texto = textoCompartir(lugar('renovacion-7'));
  assert.match(texto, /Renovación VII/);
  assert.match(texto, /por confirmar/);
  assert.match(texto, /no oficial|No es una app oficial/i);
  assert.match(texto, /15:00 a 23:00/);
});
