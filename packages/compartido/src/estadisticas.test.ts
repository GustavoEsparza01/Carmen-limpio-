import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularEstadisticas, lunesDe, type ReporteParaEstadistica } from './estadisticas.ts';
import { ubicacionDeLugar } from './trazado.ts';

const AHORA = new Date('2026-11-10T16:00:00Z'); // martes 10:00 en Mérida

function reporte(datos: Partial<ReporteParaEstadistica>): ReporteParaEstadistica {
  return {
    tipo: 'acumulacion',
    estado: 'recibido',
    creado: '2026-11-09T16:00:00Z',
    historial: [],
    incidenciaId: null,
    ...datos,
  };
}

test('la semana empieza en lunes, en hora de Mérida', () => {
  assert.equal(lunesDe('2026-11-10'), '2026-11-09');
  assert.equal(lunesDe('2026-11-09'), '2026-11-09');
  assert.equal(lunesDe('2026-11-08'), '2026-11-02');
});

test('las cifras cuadran con los reportes', () => {
  const lista = [
    reporte({ tipo: 'noPaso', lugarId: 'bivalvo', incidenciaId: 1 }),
    reporte({ tipo: 'noPaso', lugarId: 'bivalvo', incidenciaId: 1, estado: 'enRevision' }),
    reporte({
      tipo: 'tiradero',
      punto: [-91.8, 18.65],
      estado: 'atendido',
      historial: [
        { estado: 'recibido', fecha: '2026-11-09T16:00:00Z', nota: '' },
        { estado: 'atendido', fecha: '2026-11-10T04:00:00Z', nota: '' },
      ],
    }),
    reporte({
      estado: 'rechazado',
      creado: '2026-11-03T16:00:00Z',
      historial: [{ estado: 'rechazado', fecha: '2026-11-03T22:00:00Z', nota: '' }],
    }),
  ];
  const e = calcularEstadisticas(lista, AHORA);
  assert.equal(e.total, 4);
  assert.equal(e.pendientes, 2);
  assert.equal(e.porTipo.noPaso.recibido + e.porTipo.noPaso.enRevision, 2);
  assert.equal(e.porEstado.atendido, 1);
  assert.equal(e.incidencias, 1, 'dos "no pasó" iguales cuentan como una incidencia');
  assert.equal(e.horasMedianaCierre, 9, 'mediana de 12 h y 6 h');
  assert.equal(e.porSemana.length, 8);
  assert.deepEqual(e.porSemana.at(-1), { lunes: '2026-11-09', total: 3 });
  assert.deepEqual(e.porSemana.at(-2), { lunes: '2026-11-02', total: 1 });
  assert.deepEqual(e.lugares[0], { lugarId: 'bivalvo', total: 2 });
  assert.equal(e.porSemana.reduce((n, s) => n + s.total, 0), e.total);
});

test('el mapa usa el punto marcado o la ubicación del lugar', () => {
  const e = calcularEstadisticas(
    [
      reporte({ lugarId: 'bivalvo' }),
      reporte({ lugarId: 'bivalvo' }),
      reporte({ punto: [-91.8, 18.65] }),
      reporte({ lugarId: 'no-existe' }),
    ],
    AHORA,
  );
  assert.ok(ubicacionDeLugar('bivalvo'));
  assert.equal(e.puntos.find((p) => p.peso === 2)?.coordenadas, ubicacionDeLugar('bivalvo'));
  assert.equal(e.sinUbicacion, 1);
  assert.equal(e.puntos.reduce((n, p) => n + p.peso, 0) + e.sinUbicacion, 4);
});

test('sin reportes no hay mediana ni puntos', () => {
  const e = calcularEstadisticas([], AHORA);
  assert.equal(e.total, 0);
  assert.equal(e.horasMedianaCierre, null);
  assert.deepEqual(e.puntos, []);
});
