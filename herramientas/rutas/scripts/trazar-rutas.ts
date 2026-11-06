// Traza las 15 rutas sobre la red vial de OSM: node scripts/trazar-rutas.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
type P = { lat: number; lon: number };
type Edge = { to: number; w: number; m: number };
const osm = JSON.parse(readFileSync('data/osm/isla.json', 'utf8')).elements as any[];
const cat = JSON.parse(readFileSync('data/rutas.json', 'utf8'));
const ubic = JSON.parse(readFileSync('data/ubicaciones.json', 'utf8'));
const SALIDA_LON = -91.745; // borde oriente de la zona urbana, sobre la carretera 180

const R = 6371000, rad = Math.PI / 180;
const dist = (a: P, b: P) => {
  const x = (b.lon - a.lon) * rad * Math.cos((a.lat + b.lat) / 2 * rad), y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * R;
};

// --- Grafo dirigido: respeta sentidos y excluye acceso privado ---
const FACTOR: Record<string, number> = { motorway: .8, trunk: .8, primary: .8, secondary: .85, tertiary: .9, residential: 1, living_street: 1.3, unclassified: 1, service: 2.5 };
const nodes: P[] = [], idx = new Map<string, number>(), adj: Edge[][] = [];
const id = (g: P) => {
  const k = g.lat + ',' + g.lon;
  let i = idx.get(k);
  if (i === undefined) { i = nodes.length; idx.set(k, i); nodes.push({ lat: g.lat, lon: g.lon }); adj.push([]); }
  return i;
};
const roads = osm.filter(e => e.type === 'way' && e.tags?.highway && e.geometry);
for (const w of roads) {
  const t = w.tags;
  if (t.access === 'private' || t.access === 'no') continue;
  const f = FACTOR[t.highway.replace('_link', '')] ?? 1.5;
  const rev = t.oneway === '-1', one = t.oneway === 'yes' || t.oneway === '1' || rev || t.junction === 'roundabout';
  for (let i = 0; i + 1 < w.geometry.length; i++) {
    let a = id(w.geometry[i]), b = id(w.geometry[i + 1]);
    if (rev) [a, b] = [b, a];
    const m = dist(nodes[a], nodes[b]);
    adj[a].push({ to: b, w: m * f, m });
    if (!one) adj[b].push({ to: a, w: m * f, m });
  }
}

// --- Componente fuertemente conexa mayor (Kosaraju iterativo) ---
const radj: number[][] = nodes.map(() => []);
adj.forEach((es, a) => es.forEach(e => radj[e.to].push(a)));
const seen = new Uint8Array(nodes.length), order: number[] = [];
for (let s = 0; s < nodes.length; s++) {
  if (seen[s]) continue;
  seen[s] = 1;
  const st: [number, number][] = [[s, 0]];
  while (st.length) {
    const top = st[st.length - 1];
    if (top[1] < adj[top[0]].length) {
      const v = adj[top[0]][top[1]++].to;
      if (!seen[v]) { seen[v] = 1; st.push([v, 0]); }
    } else { order.push(top[0]); st.pop(); }
  }
}
const comp = new Int32Array(nodes.length).fill(-1);
const size: number[] = [];
for (let i = order.length - 1; i >= 0; i--) {
  const s = order[i];
  if (comp[s] >= 0) continue;
  const c = size.length;
  comp[s] = c;
  let n = 1;
  const st = [s];
  while (st.length) {
    const u = st.pop()!;
    for (const v of radj[u]) if (comp[v] < 0) { comp[v] = c; n++; st.push(v); }
  }
  size.push(n);
}
const big = size.indexOf(Math.max(...size));
const snap = (p: P) => {
  let b = -1, d = 1e12;
  nodes.forEach((n, i) => { if (comp[i] !== big) return; const x = dist(p, n); if (x < d) { d = x; b = i; } });
  return { i: b, d };
};

// --- Dijkstra con montículo binario ---
function dijkstra(src: number) {
  const D = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1);
  D[src] = 0;
  const h: [number, number][] = [[0, src]];
  const push = (x: [number, number]) => {
    h.push(x);
    let i = h.length - 1;
    while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
  };
  const pop = () => {
    const t = h[0], l = h.pop()!;
    if (h.length) {
      h[0] = l;
      let i = 0;
      for (;;) {
        let m = i;
        const a = 2 * i + 1, b = a + 1;
        if (a < h.length && h[a][0] < h[m][0]) m = a;
        if (b < h.length && h[b][0] < h[m][0]) m = b;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return t;
  };
  while (h.length) {
    const [d, u] = pop();
    if (d > D[u]) continue;
    for (const e of adj[u]) { const n = d + e.w; if (n < D[e.to]) { D[e.to] = n; prev[e.to] = u; push([n, e.to]); } }
  }
  return { D, prev };
}
const camino = (prev: Int32Array, a: number, b: number) => {
  const c = [b];
  while (c[c.length - 1] !== a) {
    const p = prev[c[c.length - 1]];
    if (p < 0) throw new Error('sin camino');
    c.push(p);
  }
  return c.reverse();
};

// --- Resolver ubicaciones ---
const lugares = new Map<string, P>();
for (const e of osm) {
  if (!e.tags?.name || !e.tags.place) continue;
  const p = e.type === 'node' ? { lat: e.lat, lon: e.lon } : e.bounds ? { lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2 } : null;
  if (p && !lugares.has(e.tags.name)) lugares.set(e.tags.name, p);
}
function extremosCalle(nombre: string, near?: [number, number]): P[] {
  let pts: P[] = roads.filter(w => w.tags.name === nombre).flatMap(w => w.geometry);
  if (!pts.length) throw new Error('Calle no existe: ' + nombre);
  if (near) {
    const c = { lat: near[0], lon: near[1] };
    pts = pts.filter(p => dist(p, c) < 450);
    if (!pts.length) throw new Error('Calle lejos: ' + nombre);
  }
  let a = pts[0], b = pts[0], d = -1;
  for (let i = 0; i < pts.length; i += 2) for (let j = i; j < pts.length; j += 2) {
    const x = dist(pts[i], pts[j]);
    if (x > d) { d = x; a = pts[i]; b = pts[j]; }
  }
  return d < 60 ? [a] : [a, b];
}
const nombreDe = (l: any): string => typeof l === 'string' ? l : l.nombre;

// --- Punto de salida común hacia carretera 180 (no es la ubicación del relleno) ---
const carretera = roads.filter(w => w.tags.name === 'Carretera Cd. del Carmen - Campeche').flatMap(w => w.geometry) as P[];
if (!carretera.length) throw new Error('sin carretera');
const puntoSalida = carretera.reduce((b, p) => Math.abs(p.lon - SALIDA_LON) < Math.abs(b.lon - SALIDA_LON) ? p : b);
const salida = snap(puntoSalida).i;
const dS = dijkstra(salida);

const features: any[] = [], paradasF: any[] = [], resumen: any[] = [];
const validacion: string[] = ['ruta,turno,lugar,confianza,dias,nota'];
for (const r of cat.rutas) {
  const stops: { n: number; lugar: string; conf: string }[] = [];
  const faltan: string[] = [];
  for (const l of r.lugares) {
    const nom = nombreDe(l), u = ubic[r.id]?.[nom];
    if (!u) throw new Error(`Sin catálogo: ${r.id} ${nom}`);
    validacion.push([r.id, r.turno, `"${nom}"`, u.conf, (l.dias ?? cat.dias).join(' '), `"${l.nota ?? ''}"`].join(','));
    if (u.conf === 'ninguna') { faltan.push(nom); continue; }
    let pts: P[];
    if (u.p) {
      const p = lugares.get(u.p);
      if (!p) throw new Error('Lugar no existe: ' + u.p);
      pts = [p];
    } else if (u.c) pts = [{ lat: u.c[0], lon: u.c[1] }];
    else pts = extremosCalle(u.s, u.near);
    for (const p of pts) {
      const s = snap(p);
      if (s.d > 400) console.warn(`  lejos de la red ${r.id} ${nom}: ${Math.round(s.d)} m`);
      if (!stops.some(x => x.n === s.i)) stops.push({ n: s.i, lugar: nom, conf: u.conf });
    }
  }
  // Orden: vecino más cercano + 2-opt con distancias reales de red
  const dj = stops.map(s => dijkstra(s.n));
  const dd = (i: number, j: number) => dj[i].D[stops[j].n];
  const entrada = (j: number) => dS.D[stops[j].n], retorno = (i: number) => dj[i].D[salida];
  const left = new Set(stops.map((_, i) => i));
  let t: number[] = [], cur = -1;
  while (left.size) {
    let b = -1, v = Infinity;
    for (const j of left) { const c = cur < 0 ? entrada(j) : dd(cur, j); if (c < v) { v = c; b = j; } }
    t.push(b); left.delete(b); cur = b;
  }
  const coste = (x: number[]) => {
    let c = entrada(x[0]) + retorno(x[x.length - 1]);
    for (let i = 0; i + 1 < x.length; i++) c += dd(x[i], x[i + 1]);
    return c;
  };
  let mejor = coste(t), ok = true;
  while (ok) {
    ok = false;
    for (let i = 0; i < t.length - 1; i++) for (let j = i + 1; j < t.length; j++) {
      const n = [...t.slice(0, i), ...t.slice(i, j + 1).reverse(), ...t.slice(j + 1)];
      const c = coste(n);
      if (c < mejor - 1) { t = n; mejor = c; ok = true; }
    }
  }
  // Geometría
  const servicio: number[] = [];
  for (let i = 0; i + 1 < t.length; i++) {
    const c = camino(dj[t[i]].prev, stops[t[i]].n, stops[t[i + 1]].n);
    servicio.push(...(servicio.length ? c.slice(1) : c));
  }
  const ultimo = t[t.length - 1];
  const ida = camino(dS.prev, salida, stops[t[0]].n), vuelta = camino(dj[ultimo].prev, stops[ultimo].n, salida);
  const km = (c: number[]) => { let m = 0; for (let i = 0; i + 1 < c.length; i++) m += dist(nodes[c[i]], nodes[c[i + 1]]); return m / 1000; };
  const coords = (c: number[]) => c.map(i => [+nodes[i].lon.toFixed(6), +nodes[i].lat.toFixed(6)]);
  const base = { ruta: r.id, turno: r.turno, numero: r.numero, inicio: cat.turnos[r.turno].inicio, fin: cat.turnos[r.turno].fin };
  if (servicio.length > 1) features.push({ type: 'Feature', properties: { ...base, tramo: 'servicio', km: +km(servicio).toFixed(1) }, geometry: { type: 'LineString', coordinates: coords(servicio) } });
  features.push({ type: 'Feature', properties: { ...base, tramo: 'traslado', km: +(km(ida) + km(vuelta)).toFixed(1) }, geometry: { type: 'MultiLineString', coordinates: [coords(ida), coords(vuelta)] } });
  t.forEach((s, o) => paradasF.push({ type: 'Feature', properties: { ruta: r.id, turno: r.turno, orden: o + 1, lugar: stops[s].lugar, confianza: stops[s].conf }, geometry: { type: 'Point', coordinates: [nodes[stops[s].n].lon, nodes[stops[s].n].lat] } }));
  // Verificación: cada arista del recorrido existe en el grafo dirigido
  for (const c of [ida, servicio, vuelta]) for (let i = 0; i + 1 < c.length; i++) {
    if (!adj[c[i]].some(e => e.to === c[i + 1])) throw new Error('arista inexistente ' + r.id);
  }
  resumen.push({ ruta: r.id, turno: r.turno, lugares: r.lugares.length, ubicados: r.lugares.length - faltan.length, faltan, kmServicio: +km(servicio).toFixed(1), kmTraslado: +(km(ida) + km(vuelta)).toFixed(1) });
}
mkdirSync('salida', { recursive: true });
writeFileSync('salida/rutas.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
writeFileSync('salida/paradas.geojson', JSON.stringify({ type: 'FeatureCollection', features: paradasF }));
writeFileSync('salida/validacion.csv', '﻿' + validacion.join('\n'));
writeFileSync('salida/resumen.json', JSON.stringify({ salida: nodes[salida], resumen }, null, 1));
console.log('nodos', nodes.length, 'en red conexa', size[big], 'componentes', size.length);
console.log('salida', nodes[salida]);
console.table(resumen.map(r => ({ ...r, faltan: r.faltan.length })));
const cnt: Record<string, number> = {};
for (const r of cat.rutas) for (const l of r.lugares) { const c = ubic[r.id][nombreDe(l)].conf; cnt[c] = (cnt[c] || 0) + 1; }
console.log(cnt);
