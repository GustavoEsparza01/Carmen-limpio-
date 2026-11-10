import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agruparRutas, LUGARES, type Lugar } from './catalogo.ts';
import {
  avisosDesdeFilas,
  CatalogoInvalido,
  lugaresDesdeFilas,
  unidadesDesdeFilas,
  type FilaLugar,
  type FilaUnidad,
} from './remoto.ts';

// Así devuelve PostgREST el catálogo: horarios anidados y en cualquier orden.
function aFilas(lugares: readonly Lugar[]): FilaLugar[] {
  return [...lugares].reverse().map((l) => ({
    id: l.id,
    nombre: l.nombre,
    tipo: l.tipo,
    horarios: [...l.horarios].reverse().map((h) => ({
      ruta_id: h.rutaId,
      dias: [...h.dias].reverse(),
      confianza: h.confianza,
      por_confirmar: h.porConfirmar,
      rutas: { numero: h.numero, turno: h.turno },
    })),
  }));
}

test('las filas de Supabase reproducen el catálogo incluido en la app', () => {
  assert.deepEqual(lugaresDesdeFilas(aFilas(LUGARES)), LUGARES);
});

test('el catálogo remoto conserva 15 rutas y 123 entradas', () => {
  const rutas = agruparRutas(lugaresDesdeFilas(aFilas(LUGARES)));
  assert.equal(rutas.length, 15);
  assert.equal(rutas.reduce((n, r) => n + r.paradas.length, 0), 123);
});

test('un catálogo vacío o dañado se rechaza', () => {
  assert.throws(() => lugaresDesdeFilas([]), CatalogoInvalido);
  const [primera] = aFilas(LUGARES);
  assert.throws(() => lugaresDesdeFilas([{ ...primera!, horarios: [] }]), CatalogoInvalido);
  const sinRuta = { ...primera!, horarios: [{ ...primera!.horarios[0]!, rutas: null }] };
  assert.throws(() => lugaresDesdeFilas([sinRuta]), CatalogoInvalido);
  const diaRaro = { ...primera!, horarios: [{ ...primera!.horarios[0]!, dias: ['feriado' as never] }] };
  assert.throws(() => lugaresDesdeFilas([diaRaro]), CatalogoInvalido);
});

test('las unidades solo toman asignaciones vigentes', () => {
  const filas: FilaUnidad[] = [
    {
      numero: 8,
      placas: null,
      estado: 'activa',
      asignaciones: [{ ruta_id: 'V8', desde: '2026-11-01', hasta: null, rutas: { turno: 'vespertino' } }],
    },
    {
      numero: 1,
      placas: 'ABC-123',
      estado: 'activa',
      asignaciones: [
        { ruta_id: 'M1', desde: '2026-11-01', hasta: null, rutas: { turno: 'matutino' } },
        { ruta_id: 'V1', desde: '2026-10-01', hasta: '2026-10-31', rutas: { turno: 'vespertino' } },
      ],
    },
  ];
  assert.deepEqual(unidadesDesdeFilas(filas, '2026-11-09'), [
    { numero: 1, matutina: 'M1', vespertina: null, placas: 'ABC-123', estado: 'activa' },
    { numero: 8, matutina: null, vespertina: 'V8', placas: null, estado: 'activa' },
  ]);
});

test('solo se muestran avisos vigentes, el más reciente primero', () => {
  const base = { tipo: 'general' as const, titulo: 't', texto: 'x', imagen: null, imagen_alt: null, avisos_lugares: [] };
  const ahora = new Date('2026-11-09T18:00:00Z');
  const avisos = avisosDesdeFilas(
    [
      { ...base, id: 1, desde: '2026-11-01T00:00:00Z', hasta: null },
      { ...base, id: 2, desde: '2026-11-08T00:00:00Z', hasta: '2026-11-10T00:00:00Z' },
      { ...base, id: 3, desde: '2026-11-01T00:00:00Z', hasta: '2026-11-05T00:00:00Z' },
      { ...base, id: 4, desde: '2026-11-20T00:00:00Z', hasta: null },
    ],
    ahora,
  );
  assert.deepEqual(avisos.map((a) => a.id), ['2', '1']);
});

test('el aviso trae sus lugares por nombre y su imagen con descripción', () => {
  const [aviso] = avisosDesdeFilas(
    [
      {
        id: 7,
        tipo: 'servicio',
        titulo: 'Sin servicio',
        texto: 'Texto',
        desde: '2026-11-01T00:00:00Z',
        hasta: null,
        imagen: 'cartel.jpg',
        imagen_alt: 'Cartel con el aviso',
        avisos_lugares: [{ lugar_id: 'san-manuel' }, { lugar_id: 'bivalvo' }, { lugar_id: 'ya-no-existe' }],
      },
    ],
    new Date('2026-11-09T18:00:00Z'),
  );
  assert.deepEqual(aviso?.lugares, ['Bivalvo', 'San Manuel']);
  assert.deepEqual(aviso?.imagen, { ruta: 'cartel.jpg', descripcion: 'Cartel con el aviso' });
});
