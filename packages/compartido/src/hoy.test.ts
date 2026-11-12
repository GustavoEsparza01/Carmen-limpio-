import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUGARES, lugarPorId, type Horario } from './catalogo.ts';
import { estadoDeHoy, momentoEnMerida } from './hoy.ts';

// Mérida está en UTC-6 todo el año. El 10 de noviembre de 2026 es martes.
const merida = (fecha: string) => new Date(`${fecha}-06:00`);
const horariosDe = (id: string): Horario[] => lugarPorId(id)!.horarios;

const MATUTINO: Horario = {
  confianza: 'alta',
  dias: ['martes', 'jueves', 'sabado'],
  numero: 1,
  porConfirmar: false,
  rutaId: 'M1',
  turno: 'matutino',
};
const VESPERTINO: Horario = { ...MATUTINO, numero: 1, rutaId: 'V1', turno: 'vespertino' };

test('antes de la ventana avisa el día y la ventana, sin hora de llegada', () => {
  const hoy = estadoDeHoy([VESPERTINO], merida('2026-11-10T10:00:00'));
  assert.equal(hoy?.estado, 'antes');
  assert.equal(hoy?.mensaje, 'Hoy es día de recolección, de 15:00 a 23:00');
});

test('dentro de la ventana dice hasta cuándo sigue abierta', () => {
  const hoy = estadoDeHoy([VESPERTINO], merida('2026-11-10T18:30:00'));
  assert.equal(hoy?.estado, 'enCurso');
  assert.equal(hoy?.mensaje, 'Ventana de recolección abierta, hasta las 23:00');
});

test('al terminar la ventana indica la próxima', () => {
  const hoy = estadoDeHoy([VESPERTINO], merida('2026-11-10T23:30:00'));
  assert.equal(hoy?.estado, 'terminada');
  assert.equal(hoy?.mensaje, 'La ventana de hoy terminó. Próxima: jueves');
});

test('en otro día indica la próxima ventana', () => {
  const hoy = estadoDeHoy([MATUTINO], merida('2026-11-09T12:00:00'));
  assert.equal(hoy?.estado, 'otroDia');
  assert.equal(hoy?.mensaje, 'Próxima recolección: martes, de 7:00 a 15:00');
});

test('los límites de la ventana son exactos', () => {
  assert.equal(estadoDeHoy([MATUTINO], merida('2026-11-10T06:59:00'))?.estado, 'antes');
  assert.equal(estadoDeHoy([MATUTINO], merida('2026-11-10T07:00:00'))?.estado, 'enCurso');
  assert.equal(estadoDeHoy([MATUTINO], merida('2026-11-10T14:59:00'))?.estado, 'enCurso');
  assert.equal(estadoDeHoy([MATUTINO], merida('2026-11-10T15:00:00'))?.estado, 'terminada');
});

test('a las 15:00 cierra la ventana matutina y abre la vespertina', () => {
  const hoy = estadoDeHoy([MATUTINO, VESPERTINO], merida('2026-11-10T15:00:00'));
  assert.equal(hoy?.estado, 'enCurso');
  assert.equal(hoy?.horarios[0]?.rutaId, 'V1');
});

test('el estado cambia con el día a medianoche', () => {
  const antes = estadoDeHoy([MATUTINO], merida('2026-11-10T23:59:00'));
  const despues = estadoDeHoy([MATUTINO], merida('2026-11-11T00:00:00'));
  assert.equal(antes?.estado, 'terminada');
  assert.equal(antes?.dia, 'martes');
  assert.equal(despues?.estado, 'otroDia');
  assert.equal(despues?.dia, 'miercoles');
});

test('del sábado pasa al martes siguiente', () => {
  const domingo = estadoDeHoy([MATUTINO], merida('2026-11-15T09:00:00'));
  assert.equal(domingo?.mensaje, 'Próxima recolección: martes, de 7:00 a 15:00');
  const sabado = estadoDeHoy([MATUTINO], merida('2026-11-14T16:00:00'));
  assert.equal(sabado?.mensaje, 'La ventana de hoy terminó. Próxima: martes');
});

test('un lugar de un solo día aclara que la próxima es la otra semana', () => {
  const hoy = estadoDeHoy([{ ...VESPERTINO, dias: ['martes'] }], merida('2026-11-10T23:30:00'));
  assert.equal(hoy?.mensaje, 'La ventana de hoy terminó. Próxima: martes de la próxima semana');
});

test('usa la hora de Mérida aunque el teléfono esté en otra zona', () => {
  // 01:10 del sábado en UTC sigue siendo viernes 19:10 en Mérida.
  const instante = new Date('2026-11-07T01:10:00Z');
  const original = process.env.TZ;
  try {
    for (const zona of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zona;
      assert.deepEqual(momentoEnMerida(instante), { dia: 'viernes', minutos: 19 * 60 + 10 });
      assert.equal(estadoDeHoy([MATUTINO], instante)?.estado, 'otroDia');
    }
  } finally {
    process.env.TZ = original;
  }
});

test('Bivalvo usa la ruta de cada día', () => {
  const martes = estadoDeHoy(horariosDe('bivalvo'), merida('2026-11-10T16:00:00'));
  assert.deepEqual(martes?.horarios.map((h) => h.rutaId), ['V2']);
  const jueves = estadoDeHoy(horariosDe('bivalvo'), merida('2026-11-12T16:00:00'));
  assert.deepEqual(jueves?.horarios.map((h) => h.rutaId), ['V3']);
});

test('Avenida Nardos reúne las dos rutas que comparten ventana', () => {
  const hoy = estadoDeHoy(horariosDe('avenida-nardos'), merida('2026-11-10T08:00:00'));
  assert.deepEqual(hoy?.horarios.map((h) => h.rutaId), ['M2', 'M4']);
});

test('Renovación VII marca por confirmar solo la ventana deducida', () => {
  const martes = estadoDeHoy(horariosDe('renovacion-7'), merida('2026-11-10T16:00:00'));
  assert.equal(martes?.porConfirmar, false);
  const jueves = estadoDeHoy(horariosDe('renovacion-7'), merida('2026-11-12T16:00:00'));
  assert.equal(jueves?.porConfirmar, true);
  const trasMartes = estadoDeHoy(horariosDe('renovacion-7'), merida('2026-11-10T23:30:00'));
  assert.equal(trasMartes?.porConfirmar, true);
});

test('sin horarios no inventa un estado', () => {
  assert.equal(estadoDeHoy([], merida('2026-11-10T10:00:00')), null);
});

test('todos los lugares tienen estado a cualquier hora de la semana', () => {
  for (const lugar of LUGARES) {
    for (let hora = 0; hora < 7 * 24; hora += 3) {
      const instante = new Date(merida('2026-11-09T00:30:00').getTime() + hora * 3_600_000);
      const hoy = estadoDeHoy(lugar.horarios, instante);
      assert.ok(hoy, lugar.id);
      assert.ok(hoy.horarios.length > 0, lugar.id);
      assert.doesNotMatch(hoy.mensaje, /llega|pasó|cerca/i, lugar.id);
    }
  }
});
