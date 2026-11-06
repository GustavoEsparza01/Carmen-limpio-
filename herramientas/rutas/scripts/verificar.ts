// Verificación independiente del trazador: alcance en ambos sentidos y continuidad de cada tramo.
import { readFileSync } from 'node:fs';
const rj = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const way = rj('data/osm/isla.json').elements.filter((e: any) => e.type === 'way' && e.tags?.highway && e.geometry && e.tags.access !== 'private' && e.tags.access !== 'no');
const out = new Map<string, Set<string>>(), inn = new Map<string, Set<string>>();
const add = (m: Map<string, Set<string>>, a: string, b: string) => { if (!m.has(a)) m.set(a, new Set()); m.get(a)!.add(b); };
const key = (g: any) => (+g.lon).toFixed(6) + ',' + (+g.lat).toFixed(6);
for (const w of way) for (let i = 0; i + 1 < w.geometry.length; i++) {
  let a = key(w.geometry[i]), b = key(w.geometry[i + 1]); const t = w.tags;
  if (t.oneway === '-1') [a, b] = [b, a];
  const one = t.oneway === 'yes' || t.oneway === '1' || t.oneway === '-1' || t.junction === 'roundabout';
  add(out, a, b); add(inn, b, a); if (!one) { add(out, b, a); add(inn, a, b); }
}
const f = rj('salida/rutas.geojson').features, p = rj('salida/paradas.geojson').features;
const inicio = key({ lon: f[1].geometry.coordinates[0][0][0], lat: f[1].geometry.coordinates[0][0][1] });
const bfs = (m: Map<string, Set<string>>) => { const s = new Set([inicio]), q = [inicio]; while (q.length) for (const v of m.get(q.pop()!) ?? []) if (!s.has(v)) { s.add(v); q.push(v); } return s; };
const fw = bfs(out), bw = bfs(inn); console.log('nodos', out.size, 'alcanzables', fw.size, 'de regreso', bw.size);
let saltos = 0, contra = 0, seg = 0;
for (const x of f) for (const l of x.geometry.type === 'LineString' ? [x.geometry.coordinates] : x.geometry.coordinates) for (let i = 0; i + 1 < l.length; i++) {
  seg++; const a = l[i].map((v: number) => v.toFixed(6)).join(), b = l[i + 1].map((v: number) => v.toFixed(6)).join();
  if (!out.has(a)) saltos++; else if (!out.get(a)!.has(b)) contra++;
}
console.log('segmentos', seg, 'fuera de red', saltos, 'contra sentido/inexistentes', contra);
const r = new Set(f.map((x: any) => x.properties.ruta)); console.log('rutas', r.size, 'paradas', p.length);
const c: Record<string, number> = {}; p.forEach((x: any) => c[x.properties.confianza] = (c[x.properties.confianza] || 0) + 1); console.log(c);
console.log('km servicio', f.filter((x: any) => x.properties.tramo === 'servicio').reduce((a: number, x: any) => a + x.properties.km, 0).toFixed(1));
