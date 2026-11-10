import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avanzarReporte,
  crearReporte,
  etiquetaFecha,
  fechaEnMerida,
  fechaHoraLegible,
  fechasConRecoleccion,
  fechasRecientes,
  leerReportes,
  pasosDeLinea,
  siguientesEstados,
  validarReporte,
  type BorradorReporte,
} from './reportes.ts';
import {
  AVISOS_EJEMPLO,
  crearServicioAvisos,
  crearServicioReportes,
  crearServicioSesion,
  type Almacen,
} from './servicios.ts';

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

function almacenEnMemoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    leer: async (clave) => datos.get(clave) ?? null,
    escribir: async (clave, valor) => void datos.set(clave, valor),
    borrar: async (clave) => void datos.delete(clave),
  };
}

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

test('un reporte nuevo queda recibido, con su primer evento', () => {
  const reporte = crearReporte({ ...ACUMULACION, descripcion: '  Con espacios de más  ' }, 'r1', AHORA);
  assert.equal(reporte.estado, 'recibido');
  assert.equal(reporte.descripcion, 'Con espacios de más');
  assert.equal(reporte.historial.length, 1);
  assert.equal(reporte.creado, AHORA.toISOString());
});

test('avanza por recibido, en revisión y atendido o rechazado', () => {
  const recibido = crearReporte(CASA, 'r1', AHORA);
  const revision = avanzarReporte(recibido, 'enRevision', AHORA);
  assert.deepEqual(siguientesEstados('enRevision'), ['atendido', 'rechazado']);
  const atendido = avanzarReporte(revision, 'atendido', AHORA);
  assert.deepEqual(atendido.historial.map((e) => e.estado), ['recibido', 'enRevision', 'atendido']);
  assert.deepEqual(siguientesEstados('atendido'), []);
  assert.equal(avanzarReporte(revision, 'rechazado', AHORA).estado, 'rechazado');
});

test('no permite saltarse pasos ni reabrir un reporte', () => {
  const recibido = crearReporte(CASA, 'r1', AHORA);
  assert.throws(() => avanzarReporte(recibido, 'atendido', AHORA));
  const atendido = avanzarReporte(avanzarReporte(recibido, 'enRevision', AHORA), 'atendido', AHORA);
  assert.throws(() => avanzarReporte(atendido, 'enRevision', AHORA));
});

test('la línea de tiempo muestra la rama que tomó el reporte', () => {
  assert.deepEqual(pasosDeLinea({ estado: 'recibido' }), ['recibido', 'enRevision', 'atendido']);
  assert.deepEqual(pasosDeLinea({ estado: 'rechazado' }), ['recibido', 'enRevision', 'rechazado']);
});

test('las notas son de ejemplo y no sugieren que llegue a una autoridad', () => {
  const atendido = avanzarReporte(avanzarReporte(crearReporte(CASA, 'r1', AHORA), 'enRevision', AHORA), 'atendido', AHORA);
  for (const { nota } of atendido.historial) assert.doesNotMatch(nota, /municipio|ayuntamiento|SOS/i);
  assert.match(atendido.historial.at(-1)!.nota, /ejemplo/i);
  assert.match(atendido.historial.at(-1)!.nota, /Nadie recibió/);
});

test('datos dañados no rompen la lista', () => {
  assert.deepEqual(leerReportes(null), []);
  assert.deepEqual(leerReportes('{no es json'), []);
  assert.deepEqual(leerReportes('[{"id":1}]'), []);
});

test('los reportes se guardan, se leen y persisten en el almacén', async () => {
  const almacen = almacenEnMemoria();
  const servicio = crearServicioReportes(almacen, () => AHORA);
  const uno = await servicio.crear(CASA);
  const dos = await servicio.crear(TIRADERO);
  assert.notEqual(uno.id, dos.id);
  const otraSesion = crearServicioReportes(almacen);
  assert.deepEqual((await otraSesion.listar()).map((r) => r.id), [dos.id, uno.id]);
  assert.equal((await otraSesion.obtener(uno.id))?.tipo, 'noPaso');
  assert.equal(await otraSesion.obtener('nada'), null);
});

test('cambiar el estado actualiza solo ese reporte', async () => {
  const servicio = crearServicioReportes(almacenEnMemoria(), () => AHORA);
  const uno = await servicio.crear(CASA);
  const dos = await servicio.crear(ACUMULACION);
  await servicio.cambiarEstado(uno.id, 'enRevision');
  assert.equal((await servicio.obtener(uno.id))?.estado, 'enRevision');
  assert.equal((await servicio.obtener(dos.id))?.estado, 'recibido');
  await assert.rejects(servicio.cambiarEstado('nada', 'enRevision'));
});

test('borrar todo devuelve los reportes para poder quitar sus fotos', async () => {
  const servicio = crearServicioReportes(almacenEnMemoria(), () => AHORA);
  await servicio.crear(TIRADERO);
  const borrados = await servicio.borrarTodo();
  assert.equal(borrados[0]?.fotoUri, 'file:///foto.jpg');
  assert.deepEqual(await servicio.listar(), []);
});

test('la sesión es de demostración, sin contraseña ni datos personales', async () => {
  const almacen = almacenEnMemoria();
  const sesion = crearServicioSesion(almacen, () => AHORA);
  assert.equal(await sesion.actual(), null);
  const entrada = await sesion.entrar();
  assert.equal(entrada.demostracion, true);
  assert.deepEqual(Object.keys(entrada).sort(), ['demostracion', 'nombre', 'privacidadAceptada']);
  assert.deepEqual(await sesion.actual(), entrada);
  await sesion.salir();
  assert.equal(await sesion.actual(), null);
});

test('todos los avisos están marcados como ejemplo', async () => {
  const avisos = await crearServicioAvisos().listar();
  assert.equal(avisos.length, AVISOS_EJEMPLO.length);
  for (const { titulo, texto } of avisos) {
    assert.match(titulo, /^Ejemplo:/);
    assert.match(texto, /no es real/);
  }
});
