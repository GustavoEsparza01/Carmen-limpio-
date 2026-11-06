// Verificación independiente: reconstruye las calles desde OSM y solo lee los recorridos finales.
import { readFileSync } from 'node:fs';
const rj = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const OBLIG = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']);
const key = (lon: number, lat: number) => lon.toFixed(6) + ',' + lat.toFixed(6);
const permitido = new Set<string>(); // arcos dirigidos transitables "a>b"
const obligatorias: { a: string; b: string; doble: boolean; nombre: string; lon: number; lat: number }[] = [];
for (const w of rj('data/osm/isla.json').elements) {
  if (w.type !== 'way' || !w.tags?.highway || !w.geometry) continue;
  const t = w.tags;
  if (t.access === 'private' || t.access === 'no') continue;
  const rev = t.oneway === '-1', una = t.oneway === 'yes' || t.oneway === '1' || rev || t.junction === 'roundabout';
  for (let i = 0; i + 1 < w.geometry.length; i++) {
    const p = w.geometry[rev ? i + 1 : i], q = w.geometry[rev ? i : i + 1];
    const a = key(p.lon, p.lat), b = key(q.lon, q.lat);
    permitido.add(a + '>' + b);
    if (!una) permitido.add(b + '>' + a);
    const nombre = t.name ?? '';
    const urbano = p.lon <= -91.74 && !(p.lat < 18.626 && p.lon < -91.84);
    if (OBLIG.has(t.highway) && urbano && !/^Andador/.test(nombre) && !/Puente/.test(nombre)) obligatorias.push({ a, b, doble: !una, nombre, lon: p.lon, lat: p.lat });
  }
}
const rec = rj('salida/recorridos.geojson').features;
const hechos = new Set<string>();
let invalidos = 0, cerrados = 0, segmentos = 0;
const inicio = rec[0].geometry.coordinates[0].join();
for (const f of rec) {
  const c = f.geometry.coordinates.map((x: number[]) => key(x[0], x[1]));
  if (f.geometry.coordinates[0].join() === inicio && f.geometry.coordinates.at(-1).join() === inicio) cerrados++;
  for (let i = 0; i + 1 < c.length; i++) {
    segmentos++;
    const arco = c[i] + '>' + c[i + 1];
    if (!permitido.has(arco)) invalidos++;
    hechos.add(arco);
  }
}
const faltan = obligatorias.filter(e => !(hechos.has(e.a + '>' + e.b) || (e.doble && hechos.has(e.b + '>' + e.a))));
console.log('rutas', rec.length, 'cerradas en la salida', cerrados);
console.log('segmentos recorridos', segmentos, 'contra sentido o fuera de red', invalidos);
console.log('tramos obligatorios', obligatorias.length, 'sin cubrir', faltan.length);
if (faltan.length) console.log(faltan.slice(0, 10).map(f => `${f.nombre || '(sin nombre)'} ${f.lat},${f.lon}`).join('\n'));
const nombres = new Set(obligatorias.map(o => o.nombre).filter(Boolean));
console.log('calles con nombre cubiertas', nombres.size);
if (faltan.length || invalidos || cerrados !== rec.length) process.exit(1);
