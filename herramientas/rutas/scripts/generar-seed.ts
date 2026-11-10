// Genera supabase/seed.sql con ambos escenarios sin duplicar rutas: node scripts/generar-seed.ts
// Ejecutar desde herramientas/rutas. Fuentes: carteles (data/), trazado (salida/) y el catálogo de compartido.
import { readFileSync, writeFileSync } from 'node:fs';
import { idLugar } from '../../../packages/compartido/src/busqueda.ts';
import { LUGARES } from '../../../packages/compartido/src/catalogo.generado.ts';

const leer = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));
const cat = leer('data/rutas.json');
const rutasGeo = leer('salida/rutas.geojson');
const paradasGeo = leer('salida/paradas.geojson');
const coberturaGeo = leer('salida/cobertura.geojson');
const recorridosGeo = leer('salida/recorridos.geojson');

const q = (s: unknown) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const geo = (g: unknown) => `extensions.st_setsrid(extensions.st_geomfromgeojson(${q(JSON.stringify(g))}), 4326)`;
const multi = (g: unknown) => `extensions.st_multi(${geo(g)})`;
const rango: Record<string, number> = { alta: 3, media: 2, baja: 1, ninguna: 0 };

// Notas del cartel por ruta y lugar (excepciones de días, deducciones).
const notas = new Map<string, string>();
for (const r of cat.rutas) {
  for (const l of r.lugares) if (typeof l !== 'string' && l.nota) notas.set(`${r.id}|${l.nombre}`, l.nota);
}

// Ubicación de cada lugar: el primer punto de su ruta con mejor confianza.
const puntos = new Map<string, { confianza: string; geometria: unknown }>();
for (const f of paradasGeo.features) {
  const id = idLugar(f.properties.lugar);
  const previo = puntos.get(id);
  if (!previo || rango[f.properties.confianza] > rango[previo.confianza]) {
    puntos.set(id, { confianza: f.properties.confianza, geometria: f.geometry });
  }
}

// El trazado deja un solo punto cuando dos lugares de la ruta usan la misma referencia de OSM
// (p. ej. Santa Rita 2 y 3 → FRACC. SANTA RITA). Esos lugares comparten el punto; no se inventa otro.
const ubic = leer('data/ubicaciones.json');
const referencia = (v: any) => JSON.stringify([v.p, v.s, v.c]);
for (const [ruta, lugares] of Object.entries<any>(ubic)) {
  if (ruta.startsWith('_')) continue;
  for (const [nombre, v] of Object.entries<any>(lugares)) {
    const id = idLugar(nombre);
    if (v.conf === 'ninguna' || puntos.has(id)) continue;
    const gemelo = Object.entries<any>(lugares).find(
      ([otro, w]) => otro !== nombre && referencia(w) === referencia(v) && puntos.has(idLugar(otro)),
    );
    if (!gemelo) throw new Error(`Sin punto ni referencia compartida: ${ruta} ${nombre}`);
    puntos.set(id, { confianza: v.conf, geometria: puntos.get(idLugar(gemelo[0]))!.geometria });
  }
}

const sql: string[] = [
  '-- Generado por herramientas/rutas/scripts/generar-seed.ts. No editar a mano.',
  '-- Datos de carteles sin validación oficial. Trazos ilustrativos. Unidades y asignaciones ilustrativas.',
  '',
  '-- Rutas: una sola vez; cada escenario cuelga sus geometrías de ellas.',
];
for (const r of cat.rutas) {
  sql.push(`insert into public.rutas (id, turno, numero, validada) values (${q(r.id)}, ${q(r.turno)}, ${r.numero}, false);`);
}

sql.push('', '-- Lugares');
let entradas = 0;
const conteo: Record<string, number> = { alta: 0, media: 0, baja: 0, ninguna: 0 };
for (const l of LUGARES) {
  const mejor = l.horarios.reduce((m, h) => (rango[h.confianza] > rango[m] ? h.confianza : m), 'ninguna' as string);
  const punto = puntos.get(l.id);
  if ((mejor === 'ninguna') !== !punto) throw new Error(`Ubicación incoherente: ${l.nombre}`);
  sql.push(
    `insert into public.lugares (id, nombre, tipo, confianza, ubicacion) values (${q(l.id)}, ${q(l.nombre)}, ${q(l.tipo)}, ${q(mejor)}, ${punto ? geo(punto.geometria) : 'null'});`,
  );
}

sql.push('', '-- Horarios: la ventana viene del cartel, no de las coordenadas.');
for (const l of LUGARES) {
  for (const h of l.horarios) {
    const { inicio, fin } = cat.turnos[h.turno];
    const nota = notas.get(`${h.rutaId}|${l.nombre}`) ?? null;
    const dias = `array[${h.dias.map(q).join(', ')}]::public.dia_semana[]`;
    sql.push(
      `insert into public.horarios (lugar_id, ruta_id, dias, inicio, fin, confianza, por_confirmar, nota) values (${q(l.id)}, ${q(h.rutaId)}, ${dias}, ${q(inicio)}, ${q(fin)}, ${q(h.confianza)}, ${h.porConfirmar}, ${q(nota)});`,
    );
    entradas++;
    conteo[h.confianza]++;
  }
}

sql.push('', "-- Escenario carteles: corredor que une los lugares de cada ruta real (app ciudadana).");
for (const f of rutasGeo.features) {
  const p = f.properties;
  sql.push(`insert into public.tramos_ruta (escenario, ruta_id, tramo, km, geom) values ('carteles', ${q(p.ruta)}, ${q(p.tramo)}, ${p.km}, ${multi(f.geometry)});`);
}
for (const f of paradasGeo.features) {
  const p = f.properties;
  sql.push(
    `insert into public.paradas_ruta (escenario, ruta_id, orden, lugar_id, confianza, geom) values ('carteles', ${q(p.ruta)}, ${p.orden}, ${q(idLugar(p.lugar))}, ${q(p.confianza)}, ${geo(f.geometry)});`,
  );
}

sql.push('', '-- Escenario propuesta: diseño propio de cobertura (panel y demostración). No es el recorrido oficial.');
for (const f of coberturaGeo.features) {
  const p = f.properties;
  sql.push(`insert into public.tramos_ruta (escenario, ruta_id, tramo, km, geom) values ('propuesta', ${q(p.ruta)}, ${q(p.tramo)}, ${p.km}, ${multi(f.geometry)});`);
}
for (const f of recorridosGeo.features) {
  sql.push(`insert into public.recorridos_ruta (escenario, ruta_id, geom) values ('propuesta', ${q(f.properties.ruta)}, ${geo(f.geometry)});`);
}

// 8 vehículos, uno por número de ruta. Que cubra ambos turnos es un supuesto sin confirmar.
sql.push('', '-- Unidades y asignaciones: ilustrativas, sin placas reales.');
const numeros = [...new Set(cat.rutas.map((r: { numero: number }) => r.numero))].sort((a: any, b: any) => a - b) as number[];
for (const n of numeros) {
  sql.push(`insert into public.unidades (numero, placas, estado, nota) values (${n}, null, 'activa', 'Datos ilustrativos');`);
}
for (const r of cat.rutas) {
  sql.push(
    `insert into public.asignaciones (unidad, ruta_id, desde, hasta, nota) values (${r.numero}, ${q(r.id)}, '2026-11-01', null, 'Supuesto sin confirmar: un vehículo por número de ruta en ambos turnos');`,
  );
}

writeFileSync('../../supabase/seed.sql', sql.join('\n') + '\n');
console.log(
  `rutas ${cat.rutas.length}, lugares ${LUGARES.length}, entradas ${entradas}`,
  `(alta ${conteo.alta}, media ${conteo.media}, baja ${conteo.baja}, sin ubicar ${conteo.ninguna}),`,
  `unidades ${numeros.length}, tramos ${rutasGeo.features.length}+${coberturaGeo.features.length},`,
  `paradas ${paradasGeo.features.length}, recorridos ${recorridosGeo.features.length}`,
);
