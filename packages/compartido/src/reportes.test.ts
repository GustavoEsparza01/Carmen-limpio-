import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AVISO_PRIVACIDAD, AVISO_REPORTES } from './constantes.ts';
import { filaNuevoReporte, reportesDesdeFilas, type FilaReporte } from './remoto.ts';
import {
  etiquetaFecha,
  fechaEnMerida,
  fechaHoraLegible,
  fechasConRecoleccion,
  fechasRecientes,
  mensajeError,
  pasosDeLinea,
  siguientesEstados,
  validarCambioEstado,
  validarCuenta,
  validarReporte,
  type BorradorReporte,
} from './reportes.ts';
import { AVISOS_EJEMPLO, crearServicioAvisos } from './servicios.ts';

const AHORA = new Date('2026-11-10T16:00:00.000Z');
// Bivalvo: Ruta 2 los martes y Ruta 3 jueves y sábado, de 15:00 a 23:00. AHORA es martes 10:00 en Mérida.
const CASA: BorradorReporte = { tipo: 'noPaso', lugarId: 'bivalvo', fecha: '2026-11-07' };
const ACUMULACION: BorradorReporte = {
  tipo: 'acumulacion',
  lugarId: 'bivalvo',
  descripcion: 'Bolsas acumuladas en la esquina',
};
const TIRADERO: BorradorReporte = {
  tipo: 'tiradero',
  punto: [-91.8, 18.65],
  descripcion: 'Escombro junto al terreno baldío',
  fotoUri: 'file:///foto.jpg',
};

test('la fecha sale de la hora de Mérida, no de UTC', () => {
  assert.equal(fechaEnMerida(new Date('2026-11-11T02:00:00.000Z')), '2026-11-10');
});

test('las fechas permitidas van de hoy a 7 días atrás', () => {
  const fechas = fechasRecientes(AHORA);
  assert.equal(fechas[0], '2026-11-10');
  assert.equal(fechas.at(-1), '2026-11-03');
  assert.equal(fechas.length, 8);
});

test('las fechas se nombran en español y sin desfase de zona', () => {
  assert.equal(etiquetaFecha('2026-11-10', AHORA), 'Hoy');
  assert.equal(etiquetaFecha('2026-11-09', AHORA), 'Ayer');
  assert.equal(etiquetaFecha('2026-11-08', AHORA), 'Domingo 8');
  assert.equal(etiquetaFecha('2026-11-03', AHORA), 'Martes 3');
});

test('la hora mostrada es la de Mérida', () => {
  assert.match(fechaHoraLegible('2026-11-10T16:00:00.000Z'), /10:00/);
  assert.match(fechaHoraLegible('2026-11-11T02:00:00.000Z'), /^10 /);
});

test('un reporte completo de cada tipo es válido', () => {
  for (const borrador of [CASA, ACUMULACION, TIRADERO]) assert.deepEqual(validarReporte(borrador, AHORA), {});
});

test('"el camión no pasó" exige lugar y una fecha reciente', () => {
  const errores = validarReporte({ tipo: 'noPaso' }, AHORA);
  assert.ok(errores.lugarId && errores.fecha);
  assert.ok(validarReporte({ ...CASA, fecha: '2026-11-11' }, AHORA).fecha, 'no acepta el futuro');
  assert.ok(validarReporte({ ...CASA, fecha: '2026-10-01' }, AHORA).fecha, 'no acepta fechas viejas');
  assert.ok(validarReporte({ ...CASA, lugarId: 'no-existe' }, AHORA).lugarId);
});

test('"no pasó" solo ofrece días con recolección en ese lugar', () => {
  // Del 3 al 10 de noviembre: martes 3, jueves 5, sábado 7 y hoy martes 10 (su ventana aún no termina).
  assert.deepEqual(fechasConRecoleccion('bivalvo', AHORA), ['2026-11-07', '2026-11-05', '2026-11-03']);
  assert.deepEqual(fechasConRecoleccion(undefined, AHORA), []);
});

test('"no pasó" hoy solo cuando ya terminó la ventana', () => {
  const nocheDelMartes = new Date('2026-11-11T05:30:00.000Z'); // martes 23:30 en Mérida
  assert.equal(fechasConRecoleccion('bivalvo', nocheDelMartes)[0], '2026-11-10');
});

test('"no pasó" rechaza un día sin recolección', () => {
  assert.ok(validarReporte({ ...CASA, fecha: '2026-11-09' }, AHORA).fecha, 'lunes: no hay recolección');
  assert.ok(validarReporte({ ...CASA, fecha: '2026-11-10' }, AHORA).fecha, 'hoy, antes de la ventana');
  assert.equal(validarReporte({ ...CASA, fecha: '2026-11-05' }, AHORA).fecha, undefined);
});

test('en acumulación la foto es opcional y la descripción no', () => {
  assert.deepEqual(validarReporte(ACUMULACION, AHORA), {});
  assert.ok(validarReporte({ ...ACUMULACION, descripcion: 'poco' }, AHORA).descripcion);
  assert.ok(validarReporte({ ...ACUMULACION, descripcion: 'x'.repeat(501) }, AHORA).descripcion);
});

test('el tiradero exige punto, descripción y foto', () => {
  const errores = validarReporte({ tipo: 'tiradero' }, AHORA);
  assert.ok(errores.punto && errores.descripcion && errores.fotoUri);
  assert.equal(errores.lugarId, undefined);
});

test('el estado avanza por recibido, en revisión y atendido o rechazado', () => {
  assert.deepEqual(siguientesEstados('recibido'), ['enRevision']);
  assert.deepEqual(siguientesEstados('enRevision'), ['atendido', 'rechazado']);
  assert.deepEqual(siguientesEstados('atendido'), []);
  assert.deepEqual(siguientesEstados('rechazado'), []);
});

test('cada cambio de estado lleva una nota y no se salta pasos', () => {
  assert.equal(validarCambioEstado('recibido', 'enRevision', 'Lo estamos revisando.'), null);
  assert.ok(validarCambioEstado('recibido', 'atendido', 'Saltando pasos'));
  assert.ok(validarCambioEstado('atendido', 'enRevision', 'Reabrir'));
  assert.ok(validarCambioEstado('recibido', 'enRevision', '  '));
  assert.ok(validarCambioEstado('recibido', 'enRevision', 'x'.repeat(501)));
});

test('la línea de tiempo muestra la rama que tomó el reporte', () => {
  assert.deepEqual(pasosDeLinea({ estado: 'recibido' }), ['recibido', 'enRevision', 'atendido']);
  assert.deepEqual(pasosDeLinea({ estado: 'rechazado' }), ['recibido', 'enRevision', 'rechazado']);
});

test('la cuenta pide un correo válido y una contraseña de 8 caracteres', () => {
  assert.deepEqual(validarCuenta('vecina@correo.mx', '12345678'), {});
  assert.ok(validarCuenta('vecina@correo', '12345678').correo);
  assert.ok(validarCuenta(' ', '12345678').correo);
  assert.ok(validarCuenta('vecina@correo.mx', '1234567').clave);
});

test('los errores de Supabase se explican sin tecnicismos', () => {
  assert.match(mensajeError({ message: 'Llegaste al límite de 10 reportes en 24 horas' }), /límite de 10/);
  assert.match(mensajeError({ code: '23505', message: 'duplicate key value' }), /Ya habías reportado/);
  assert.match(mensajeError({ message: 'Ese día no hay recolección en este lugar' }), /cartel/);
  assert.match(mensajeError({ message: 'new row violates row-level security policy' }), /aviso de privacidad/);
  assert.match(
    mensajeError({ message: 'New password should be different from the old password.' }),
    /distinta a la anterior/,
  );
  assert.match(mensajeError({ message: 'Invalid login credentials' }), /no coinciden/);
  assert.match(mensajeError({ message: 'User already registered' }), /Ya existe una cuenta/);
  assert.match(mensajeError({ message: 'Network request failed' }), /conexión/);
  assert.match(mensajeError(null), /Vuelve a intentar/);
});

test('los textos no sugieren que el reporte llegue a una autoridad', () => {
  assert.match(AVISO_REPORTES, /No llegan al municipio/);
  const finalidad = AVISO_PRIVACIDAD.find((s) => s.titulo === 'Finalidad')!.texto;
  assert.match(finalidad, /no se envían al municipio/);
  assert.doesNotMatch(AVISO_REPORTES + finalidad, /SOS/);
});

test('las filas de Supabase se vuelven reportes con su historial en orden', () => {
  const fila: FilaReporte = {
    id: 'r1',
    tipo: 'tiradero',
    lugar_id: null,
    fecha: null,
    lng: -91.8,
    lat: 18.65,
    descripcion: 'Escombro junto al terreno baldío',
    foto: 'u1/foto.jpg',
    estado: 'enRevision',
    nota: 'Lo estamos revisando.',
    creado: '2026-11-10T16:00:00Z',
    historial_reportes: [
      { estado: 'enRevision', nota: 'Lo estamos revisando.', fecha: '2026-11-10T18:00:00Z' },
      { estado: 'recibido', nota: 'Recibido.', fecha: '2026-11-10T16:00:00Z' },
    ],
  };
  const otra: FilaReporte = { ...fila, id: 'r2', creado: '2026-11-11T16:00:00Z', lng: null, lat: null, foto: null };
  const [primero, segundo] = reportesDesdeFilas([fila, otra]);
  assert.equal(primero!.id, 'r2', 'los más recientes primero');
  assert.equal(primero!.punto, undefined);
  assert.deepEqual(segundo!.punto, [-91.8, 18.65]);
  assert.equal(segundo!.foto, 'u1/foto.jpg');
  assert.deepEqual(segundo!.historial.map((e) => e.estado), ['recibido', 'enRevision']);
  assert.equal(segundo!.lugarId, undefined);
});

test('la fila nueva lleva solo los campos de cada tipo', () => {
  assert.deepEqual(filaNuevoReporte({ ...CASA, descripcion: 'sobra' }, 'u1/x.jpg'), {
    tipo: 'noPaso', lugar_id: 'bivalvo', fecha: '2026-11-07', ubicacion: null, descripcion: null, foto: null,
  });
  assert.deepEqual(filaNuevoReporte({ ...ACUMULACION, descripcion: '  Bolsas en la esquina  ' }, null), {
    tipo: 'acumulacion', lugar_id: 'bivalvo', fecha: null, ubicacion: null, descripcion: 'Bolsas en la esquina', foto: null,
  });
  assert.deepEqual(filaNuevoReporte({ ...TIRADERO, lugarId: 'bivalvo' }, 'u1/foto.jpg'), {
    tipo: 'tiradero', lugar_id: null, fecha: null, ubicacion: 'SRID=4326;POINT(-91.8 18.65)',
    descripcion: 'Escombro junto al terreno baldío', foto: 'u1/foto.jpg',
  });
});

test('todos los avisos están marcados como ejemplo', async () => {
  const avisos = await crearServicioAvisos().listar();
  assert.equal(avisos.length, AVISOS_EJEMPLO.length);
  for (const { titulo, texto } of avisos) {
    assert.match(titulo, /^Ejemplo:/);
    assert.match(texto, /no es real/);
  }
});
