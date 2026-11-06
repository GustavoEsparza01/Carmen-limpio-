// Propuesta propia: 15 zonas equilibradas y un recorrido que cubre todas sus calles.
// Uso (desde la raíz del proyecto): node scripts/trazar-cobertura.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
type P = { lat: number; lon: number };
type Arc = { to: number; eid: number; m: number; w: number };

const osm = JSON.parse(readFileSync('data/osm/isla.json', 'utf8')).elements as any[];
const paradas = JSON.parse(readFileSync('salida/paradas.geojson', 'utf8')).features as any[];
const { salida: puntoSalida, resumen } = JSON.parse(readFileSync('salida/resumen.json', 'utf8'));

// Supuestos operativos: ajustarlos con datos reales de SOS.
const LIM_ORIENTE = -91.74;
const VEL_SERVICIO = 6, VEL_TRASLADO = 25, HORAS_TURNO = 8; // km/h, km/h, horas
const OBLIGATORIAS = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']);
const FACTOR: Record<string, number> = { motorway: .8, trunk: .8, primary: .8, secondary: .85, tertiary: .9, residential: 1, living_street: 1.3, unclassified: 1, service: 2.5 };

const rad = Math.PI / 180;
const dist = (a: P, b: P) => Math.hypot((b.lon - a.lon) * rad * Math.cos((a.lat + b.lat) / 2 * rad), (b.lat - a.lat) * rad) * 6371000;
const enCiudad = (p: P) => p.lon <= LIM_ORIENTE && !(p.lat < 18.626 && p.lon < -91.84);

const nodes: P[] = [], idx = new Map<string, number>(), adj: Arc[][] = [];
const id = (g: P) => { const k = g.lat + ',' + g.lon; let i = idx.get(k); if (i === undefined) { i = nodes.length; idx.set(k, i); nodes.push({ lat: g.lat, lon: g.lon }); adj.push([]); } return i; };
type Calle = { a: number; b: number; m: number; requerida: boolean; nombre: string; zona: number };
const calles: Calle[] = [];
const excluidos: Record<string, number> = {};
const excl = (k: string, m: number) => { excluidos[k] = (excluidos[k] ?? 0) + m / 1000; };

for (const w of osm) {
  if (w.type !== 'way' || !w.tags?.highway || !w.geometry) continue;
  const t = w.tags;
  if (t.access === 'private' || t.access === 'no') continue;
  const f = FACTOR[t.highway.replace('_link', '')] ?? 1.5;
  const rev = t.oneway === '-1', one = t.oneway === 'yes' || t.oneway === '1' || rev || t.junction === 'roundabout';
  for (let i = 0; i + 1 < w.geometry.length; i++) {
    let a = id(w.geometry[i]), b = id(w.geometry[i + 1]);
    if (rev) [a, b] = [b, a];
    const m = dist(nodes[a], nodes[b]), nombre = t.name ?? '';
    let req = OBLIGATORIAS.has(t.highway);
    if (req && !enCiudad(nodes[a])) { req = false; excl('fuera de zona urbana', m); }
    else if (req && /^Andador/.test(nombre)) { req = false; excl('andadores', m); }
    else if (req && /Puente/.test(nombre)) { req = false; excl('puente', m); }
    else if (t.highway === 'service') excl('vías de servicio', m);
    const eid = calles.length;
    calles.push({ a, b, m, requerida: req, nombre, zona: -1 });
    adj[a].push({ to: b, eid, m, w: m * f });
    if (!one) adj[b].push({ to: a, eid, m, w: m * f });
  }
}
const req = calles.map((c, i) => ({ c, i })).filter(x => x.c.requerida);
const kmTotal = req.reduce((s, x) => s + x.c.m, 0) / 1000;
const und: { to: number; eid: number; m: number }[][] = nodes.map(() => []);
calles.forEach((c, eid) => { und[c.a].push({ to: c.b, eid, m: c.m }); und[c.b].push({ to: c.a, eid, m: c.m }); });

class Heap { h: [number, number][] = [];
  push(x: [number, number]) { const h = this.h; h.push(x); let i = h.length - 1; while (i) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  pop() { const h = this.h, t = h[0], l = h.pop()!; if (h.length) { h[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < h.length && h[a][0] < h[m][0]) m = a; if (b < h.length && h[b][0] < h[m][0]) m = b; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return t; }
  get size() { return this.h.length; } }

// --- Zonas: crecimiento equilibrado desde una semilla y ajuste iterativo ---
const rutas: string[] = resumen.map((r: any) => r.ruta);
const nodoCercano = (p: P) => { let b = -1, d = 1e12; for (const x of req) for (const n of [x.c.a, x.c.b]) { const v = dist(p, nodes[n]); if (v < d) { d = v; b = n; } } return b; };
const medoide = (pts: P[]) => nodoCercano({ lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length });
let semillas = rutas.map(r => medoide(paradas.filter(f => f.properties.ruta === r).map(f => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }))));

function crecer(sem: number[]) {
  calles.forEach(c => c.zona = -1);
  const load = sem.map(() => 0), fr = sem.map((s) => { const h = new Heap(); h.push([0, s]); return h; }), best = sem.map(() => new Map<number, number>());
  sem.forEach((s, z) => best[z].set(s, 0));
  const meta = kmTotal * 1000 / sem.length;
  for (;;) {
    let z = -1, min = Infinity;
    for (let i = 0; i < sem.length; i++) if (fr[i].size && load[i] < min) { min = load[i]; z = i; }
    if (z < 0) break;
    const [d, u] = fr[z].pop();
    if (d > (best[z].get(u) ?? Infinity)) continue;
    for (const e of und[u]) {
      const c = calles[e.eid];
      if (c.zona >= 0 && c.zona !== z) continue; // no atraviesa zonas ajenas
      if (c.requerida && c.zona < 0 && load[z] < meta * 1.15) { c.zona = z; load[z] += c.m; }
      else if (c.requerida && c.zona < 0) continue;
      const n = d + e.m;
      if (n < (best[z].get(e.to) ?? Infinity)) { best[z].set(e.to, n); fr[z].push([n, e.to]); }
    }
  }
  // Calles que quedaron sin zona: se asignan a la zona vecina con menor carga.
  let pendientes = req.filter(x => x.c.zona < 0);
  while (pendientes.length) {
    const antes = pendientes.length;
    pendientes.sort((p, q) => p.c.m - q.c.m);
    for (const x of pendientes) {
      const vec = [...und[x.c.a], ...und[x.c.b]].map(e => calles[e.eid].zona).filter(v => v >= 0);
      if (vec.length) { const z = vec.reduce((b, v) => load[v] < load[b] ? v : b); x.c.zona = z; load[z] += x.c.m; }
    }
    pendientes = pendientes.filter(x => x.c.zona < 0);
    if (pendientes.length === antes) { // componente aislada de obligatorias: usar la semilla más cercana
      for (const x of pendientes) { let z = 0, d = Infinity; sem.forEach((s, i) => { const v = dist(nodes[x.c.a], nodes[s]); if (v < d) { d = v; z = i; } }); x.c.zona = z; load[z] += x.c.m; }
      pendientes = [];
    }
  }
  return load;
}
let load = crecer(semillas);
for (let it = 0; it < 8; it++) {
  semillas = semillas.map((s, z) => { const pts = req.filter(x => x.c.zona === z).map(x => nodes[x.c.a]); return pts.length ? medoide(pts) : s; });
  load = crecer(semillas);
}

// --- Zonas sin fragmentos: las piezas sueltas pasan a la zona vecina con más contacto ---
function compactar() {
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    let cambios = 0;
    for (let z = 0; z < rutas.length; z++) {
      const propias = req.filter(x => x.c.zona === z);
      const padre = new Map<number, number>();
      const raiz = (n: number): number => { let r = n; while ((padre.get(r) ?? r) !== r) r = padre.get(r)!; padre.set(n, r); return r; };
      for (const x of propias) padre.set(raiz(x.c.a), raiz(x.c.b));
      const grupos = new Map<number, typeof propias>();
      for (const x of propias) { const r = raiz(x.c.a); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r)!.push(x); }
      if (grupos.size < 2) continue;
      const orden = [...grupos.values()].sort((p, q) => q.reduce((s, x) => s + x.c.m, 0) - p.reduce((s, x) => s + x.c.m, 0));
      for (const g of orden.slice(1)) {
        const votos = new Map<number, number>();
        for (const x of g) for (const n of [x.c.a, x.c.b]) for (const e of und[n]) { const v = calles[e.eid]; if (v.requerida && v.zona !== z && v.zona >= 0) votos.set(v.zona, (votos.get(v.zona) ?? 0) + 1); }
        if (!votos.size) continue;
        const dest = [...votos.entries()].sort((p, q) => q[1] - p[1])[0][0];
        for (const x of g) x.c.zona = dest;
        cambios++;
      }
    }
    if (!cambios) break;
  }
}
compactar();

// --- Reparto: mueve calles de frontera de zonas cargadas a vecinas más ligeras ---
function cargas() { const l = rutas.map(() => 0); for (const x of req) l[x.c.zona] += x.c.m / 1000; return l; }
function balancear() {
  const media = kmTotal / rutas.length;
  for (let it = 0; it < 120; it++) {
    const l = cargas(), orden = l.map((v, z) => [v, z]).sort((p, q) => q[0] - p[0]);
    let movio = false;
    for (const [v, h] of orden) {
      if (v < media * 1.08) break;
      const vec = new Map<number, Set<number>>(); // zona vecina -> nodos de contacto
      for (const x of req) if (x.c.zona === h) for (const n of [x.c.a, x.c.b]) for (const e of und[n]) {
        const o = calles[e.eid];
        if (o.requerida && o.zona >= 0 && o.zona !== h) { if (!vec.has(o.zona)) vec.set(o.zona, new Set()); vec.get(o.zona)!.add(n); }
      }
      const dest = [...vec.keys()].filter(z => l[z] < v * .9).sort((p, q) => l[p] - l[q])[0];
      if (dest === undefined) continue;
      const meta = Math.min((v - l[dest]) / 2, 2.5) * 1000;
      let mov = 0;
      const cola = [...vec.get(dest)!], vistos = new Set(cola);
      while (cola.length && mov < meta) {
        const n = cola.shift()!;
        for (const e of und[n]) {
          const c = calles[e.eid];
          if (!c.requerida || c.zona !== h) continue;
          c.zona = dest; mov += c.m;
          if (!vistos.has(e.to)) { vistos.add(e.to); cola.push(e.to); }
        }
      }
      if (mov) { movio = true; break; }
    }
    compactar();
    if (!movio) break;
  }
}
balancear();
console.log('carga km por zona', cargas().map(v => +v.toFixed(1)).join(' '));

// --- Recorrido: orientación, balance por asignación óptima y circuito de Euler ---
const salidaNodo = (() => { let b = -1, d = 1e12; nodes.forEach((n, i) => { const v = dist(puntoSalida, n); if (v < d) { d = v; b = i; } }); return b; })();
function dj(src: number) {
  const D = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), prevE = new Int32Array(nodes.length).fill(-1);
  D[src] = 0;
  const h = new Heap(); h.push([0, src]);
  while (h.size) {
    const [d, u] = h.pop();
    if (d > D[u]) continue;
    for (const e of adj[u]) { const n = d + e.w; if (n < D[e.to]) { D[e.to] = n; prev[e.to] = u; prevE[e.to] = e.eid; h.push([n, e.to]); } }
  }
  return { D, prev, prevE };
}
type Paso = { from: number; to: number; eid: number; tipo: 'servicio' | 'repaso' | 'acceso' };
const camino = (t: ReturnType<typeof dj>, a: number, b: number, tipo: Paso['tipo']) => {
  const c: Paso[] = [];
  for (let v = b; v !== a; v = t.prev[v]) { if (t.prev[v] < 0) throw new Error('sin camino'); c.push({ from: t.prev[v], to: v, eid: t.prevE[v], tipo }); }
  return c.reverse();
};
function hungaro(a: number[][]) { // asignación de costo mínimo, matriz cuadrada
  const n = a.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0]; let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const r = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) r[p[j] - 1] = j - 1;
  return r;
}
const desdeSalida = dj(salidaNodo);
function recorrer(z: number, rnd: () => number) {
  const eids: number[] = [];
  calles.forEach((c, e) => { if (c.requerida && c.zona === z) eids.push(e); });
  const G: Paso[] = [], bal = new Map<number, number>();
  const add = (n: number, v: number) => bal.set(n, (bal.get(n) ?? 0) + v);
  const dobles = new Map<number, number[]>(), libres = new Set<number>();
  for (const e of eids) {
    const c = calles[e];
    if (adj[c.b].some(a => a.eid === e)) { libres.add(e); for (const n of [c.a, c.b]) { if (!dobles.has(n)) dobles.set(n, []); dobles.get(n)!.push(e); } }
    else { G.push({ from: c.a, to: c.b, eid: e, tipo: 'servicio' }); add(c.a, 1); add(c.b, -1); }
  }
  // Orienta las calles de doble sentido caminando desde los nodos más desbalanceados.
  while (libres.size) {
    let cur = -1, peor = Infinity;
    for (const e of libres) for (const n of [calles[e].a, calles[e].b]) { const v = (bal.get(n) ?? 0) + rnd() * .5; if (v < peor) { peor = v; cur = n; } }
    for (;;) {
      const op = (dobles.get(cur) ?? []).filter(e => libres.has(e));
      if (!op.length) break;
      const e = op.reduce((b, x) => { const o = (y: number) => calles[y].a === cur ? calles[y].b : calles[y].a; return (bal.get(o(x)) ?? 0) + rnd() * .5 > (bal.get(o(b)) ?? 0) + rnd() * .5 ? x : b; });
      const c = calles[e], to = c.a === cur ? c.b : c.a;
      libres.delete(e); G.push({ from: cur, to, eid: e, tipo: 'servicio' }); add(cur, 1); add(to, -1); cur = to;
    }
  }
  // Balance: cada nodo con más entradas se une al nodo con más salidas por el camino más barato.
  const fuentes: number[] = [], destinos: number[] = [];
  for (const [n, v] of bal) { for (let i = 0; i < -v; i++) fuentes.push(n); for (let i = 0; i < v; i++) destinos.push(n); }
  const tablas = new Map<number, ReturnType<typeof dj>>();
  for (const f of new Set(fuentes)) tablas.set(f, dj(f));
  if (fuentes.length) {
    const asg = hungaro(fuentes.map(f => destinos.map(d => tablas.get(f)!.D[d])));
    asg.forEach((j, i) => G.push(...camino(tablas.get(fuentes[i])!, fuentes[i], destinos[j], 'repaso')));
  }
  // Une componentes separadas con ida y vuelta por el tramo más corto.
  const padre = new Map<number, number>();
  const raiz = (n: number): number => { let r = n; while ((padre.get(r) ?? r) !== r) r = padre.get(r)!; padre.set(n, r); return r; };
  for (const p of G) padre.set(raiz(p.from), raiz(p.to));
  const nodosG = [...new Set(G.flatMap(p => [p.from, p.to]))];
  const inicio = nodosG.reduce((b, n) => desdeSalida.D[n] < desdeSalida.D[b] ? n : b);
  for (;;) {
    const base = raiz(inicio), dentro = nodosG.filter(n => raiz(n) === base), fuera = nodosG.filter(n => raiz(n) !== base);
    if (!fuera.length) break;
    let a = dentro[0], b = fuera[0], d = Infinity;
    for (const x of dentro) for (const y of fuera) { const v = dist(nodes[x], nodes[y]); if (v < d) { d = v; a = x; b = y; } }
    const ta = dj(a), tb = dj(b);
    G.push(...camino(ta, a, b, 'repaso'), ...camino(tb, b, a, 'repaso'));
    for (const p of G) padre.set(raiz(p.from), raiz(p.to));
  }
  // Hierholzer sobre el multigrafo balanceado.
  const sal = new Map<number, Paso[]>();
  for (const p of G) { if (!sal.has(p.from)) sal.set(p.from, []); sal.get(p.from)!.push(p); }
  const pila: { n: number; p: Paso | null }[] = [{ n: inicio, p: null }], circuito: Paso[] = [];
  while (pila.length) {
    const top = pila[pila.length - 1], l = sal.get(top.n);
    if (l && l.length) { const p = l.pop()!; pila.push({ n: p.to, p }); }
    else { pila.pop(); if (top.p) circuito.push(top.p); }
  }
  circuito.reverse();
  if (circuito.length !== G.length) throw new Error('circuito incompleto zona ' + rutas[z]);
  const pasos = [...camino(desdeSalida, salidaNodo, inicio, 'acceso'), ...circuito, ...camino(dj(inicio), inicio, salidaNodo, 'acceso')];
  const km = (t: Paso['tipo']) => pasos.filter(p => p.tipo === t).reduce((s, p) => s + calles[p.eid].m, 0) / 1000;
  return { pasos, kmServicio: km('servicio'), kmRepaso: km('repaso'), kmAcceso: km('acceso') };
}
const features: any[] = [], recorridos: any[] = [], res: any[] = [];
for (let z = 0; z < rutas.length; z++) {
  let mejor: ReturnType<typeof recorrer> | null = null;
  for (let s = 0; s < 10; s++) {
    let semilla = 12345 + s * 97 + z;
    const rnd = () => (semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const r = recorrer(z, rnd);
    if (!mejor || r.kmRepaso < mejor.kmRepaso) mejor = r;
  }
  const r = mejor!, ruta = rutas[z], turno = ruta[0] === 'M' ? 'matutino' : 'vespertino';
  const c = (n: number) => [+nodes[n].lon.toFixed(6), +nodes[n].lat.toFixed(6)];
  const grupos: Record<string, number[][][]> = { servicio: [], repaso: [], acceso: [] };
  let ult = '';
  for (const p of r.pasos) {
    if (ult !== p.tipo) { grupos[p.tipo].push([c(p.from)]); ult = p.tipo; }
    const g = grupos[p.tipo]; g[g.length - 1].push(c(p.to));
  }
  const base = { ruta, turno, numero: +ruta.slice(1), propuesta: true };
  for (const [t, km] of [['servicio', r.kmServicio], ['repaso', r.kmRepaso], ['acceso', r.kmAcceso]] as [string, number][]) {
    if (grupos[t].length) features.push({ type: 'Feature', properties: { ...base, tramo: t, km: +km.toFixed(1) }, geometry: { type: 'MultiLineString', coordinates: grupos[t] } });
  }
  recorridos.push({ type: 'Feature', properties: base, geometry: { type: 'LineString', coordinates: [c(r.pasos[0].from), ...r.pasos.map(p => c(p.to))] } });
  res.push({ ruta, turno, kmServicio: +r.kmServicio.toFixed(1), kmRepaso: +r.kmRepaso.toFixed(1), kmAcceso: +r.kmAcceso.toFixed(1), horas: +(r.kmServicio / VEL_SERVICIO + (r.kmRepaso + r.kmAcceso) / VEL_TRASLADO).toFixed(1), tramos: eidsDe(z) });
}
function eidsDe(z: number) { return req.filter(x => x.c.zona === z).length; }
const asignacion: Record<string, number[]> = {};
rutas.forEach((r, z) => { asignacion[r] = req.filter(x => x.c.zona === z).map(x => x.i); });
mkdirSync('salida', { recursive: true });
writeFileSync('salida/cobertura.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
writeFileSync('salida/recorridos.geojson', JSON.stringify({ type: 'FeatureCollection', features: recorridos }));
writeFileSync('salida/resumen-cobertura.json', JSON.stringify({ kmObligatorios: +kmTotal.toFixed(1), tramosObligatorios: req.length, excluidosKm: Object.fromEntries(Object.entries(excluidos).map(([k, v]) => [k, +v.toFixed(1)])), supuestos: { VEL_SERVICIO, VEL_TRASLADO, HORAS_TURNO }, salida: nodes[salidaNodo], rutas: res }, null, 1));
console.log('km obligatorios', kmTotal.toFixed(1), 'tramos', req.length, excluidos);
console.table(res);
const sum = (k: string) => res.reduce((a, r) => a + r[k], 0);
console.log('servicio', sum('kmServicio').toFixed(1), 'repaso', sum('kmRepaso').toFixed(1), 'acceso', sum('kmAcceso').toFixed(1), 'repaso/servicio %', (sum('kmRepaso') / sum('kmServicio') * 100).toFixed(0), 'max horas', Math.max(...res.map(r => r.horas)));
