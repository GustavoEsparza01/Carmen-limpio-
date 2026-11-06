// Genera el mapa de cobertura y el seed de Supabase: node scripts/generar-cobertura.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const cobertura = JSON.parse(readFileSync('salida/cobertura.geojson', 'utf8'));
const recorridos = JSON.parse(readFileSync('salida/recorridos.geojson', 'utf8'));
const R = JSON.parse(readFileSync('salida/resumen-cobertura.json', 'utf8'));

const q = (s: string) => `'${String(s).replace(/'/g, "''")}'`;
const sql = ['-- Propuesta propia de cobertura (no es el recorrido oficial). Usar en lugar de seed.sql.', 'begin;'];
for (const r of R.rutas) sql.push(`insert into rutas (id, turno, numero, validada) values (${q(r.ruta)}, ${q(r.turno)}, ${+r.ruta.slice(1)}, false);`);
for (const f of cobertura.features) {
  const p = f.properties;
  sql.push(`insert into tramos_ruta (ruta_id, tramo, km, geom) values (${q(p.ruta)}, ${q(p.tramo)}, ${p.km}, ST_SetSRID(ST_GeomFromGeoJSON(${q(JSON.stringify(f.geometry))}), 4326));`);
}
for (const f of recorridos.features) sql.push(`insert into recorridos_ruta (ruta_id, geom) values (${q(f.properties.ruta)}, ST_SetSRID(ST_GeomFromGeoJSON(${q(JSON.stringify(f.geometry))}), 4326));`);
sql.push('commit;');
mkdirSync('supabase/migrations', { recursive: true });
writeFileSync('supabase/seed-cobertura.sql', sql.join('\n') + '\n');
writeFileSync('supabase/migrations/0002_cobertura.sql', `alter table tramos_ruta drop constraint tramos_ruta_tramo_check;
alter table tramos_ruta add constraint tramos_ruta_tramo_check
  check (tramo in ('servicio', 'traslado', 'repaso', 'acceso'));

-- Orden completo del camión: sirve para el simulador y la futura comparación con GPS.
create table recorridos_ruta (
  ruta_id text primary key references rutas (id) on delete cascade,
  geom geometry(LineString, 4326) not null
);
`);

const datos = JSON.stringify({ cobertura, R }).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carmen Limpio · Propuesta de cobertura</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0;font:14px/1.4 system-ui,Segoe UI,sans-serif;color:#1f2d2a}
#app{display:flex;height:100%}#panel{width:350px;flex:none;overflow:auto;padding:16px;background:#f6f8f7;border-right:1px solid #d9e2de}
#map{flex:1;min-width:0}h1{font-size:18px;margin:0 0 2px;color:#17694f}.sub{color:#5b6b66;font-size:12px;margin:0 0 10px}
.aviso{background:#fff4d6;border:1px solid #edd68c;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:12px}
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}.kpi{background:#fff;border:1px solid #dfe7e3;border-radius:6px;padding:6px 8px;font-size:11px;color:#5b6b66}.kpi b{display:block;font-size:17px;color:#1f2d2a}
.tabs{display:flex;gap:4px;margin-bottom:8px}.tabs button{flex:1;padding:6px 4px;border:1px solid #c9d5d0;background:#fff;border-radius:5px;cursor:pointer;font:inherit;font-size:12px}
.tabs button.on{background:#17694f;color:#fff;border-color:#17694f}
label.fila{display:flex;align-items:center;gap:6px;padding:5px 2px;border-bottom:1px solid #e6ecea;cursor:pointer}
.color{width:14px;height:14px;border-radius:3px;flex:none}.fila .n{font-weight:600;width:30px}.fila .d{margin-left:auto;font-size:12px;color:#5b6b66;text-align:right}.fila .h{width:44px;text-align:right;font-size:12px;font-weight:600}.excede{color:#b4531f}
.opc{display:block;font-size:12px;margin:10px 0;color:#3f4f4a}.nota{font-size:12px;color:#5b6b66;margin-top:10px}
@media(max-width:700px){#app{flex-direction:column}#panel{width:100%;height:45%;border-right:0;border-bottom:1px solid #d9e2de}}
</style></head><body><div id="app"><aside id="panel">
<h1>Carmen Limpio</h1><p class="sub">Propuesta de cobertura por zonas</p>
<div class="aviso"><b>Propuesta propia.</b> Las zonas no corresponden a las rutas actuales de SOS. Sirve para demostrar y discutir el diseño, no para informar al público.</div>
<div class="kpis" id="kpis"></div>
<div class="tabs"><button data-t="todas" class="on">Todas</button><button data-t="matutino">Matutino</button><button data-t="vespertino">Vespertino</button></div>
<label class="opc"><input type="checkbox" id="rep"> Mostrar repasos y accesos</label>
<div id="lista"></div>
<p class="nota">Horas estimadas con ${R.supuestos.VEL_SERVICIO} km/h recolectando y ${R.supuestos.VEL_TRASLADO} km/h en traslado. No incluyen viajes al relleno, descargas ni descansos.</p>
</aside><div id="map" role="application" aria-label="Mapa de cobertura"></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const {cobertura:C,R}=${datos};
const COL=['#1b7837','#2166ac','#b2182b','#7b3294','#e08214','#01818a','#c51b7d','#5a5a00','#35978f','#4575b4','#d6604d','#8073ac','#bf812d','#66a61e','#e7298a'];
const col={};R.rutas.forEach((r,i)=>col[r.ruta]=COL[i]);
const map=L.map('map',{preferCanvas:true}).setView([18.652,-91.80],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
const srv={},ext={};let verExt=false;
for(const r of R.rutas){srv[r.ruta]=L.layerGroup().addTo(map);ext[r.ruta]=L.layerGroup();
 for(const f of C.features.filter(f=>f.properties.ruta===r.ruta)){const s=f.properties.tramo==='servicio';
  L.geoJSON(f,{style:{color:col[r.ruta],weight:s?3:2,opacity:s?.9:.6,dashArray:s?null:'4 6'}}).bindPopup('<b>'+r.ruta+'</b> · '+f.properties.tramo+' · '+f.properties.km+' km').addTo(s?srv[r.ruta]:ext[r.ruta])}}
L.marker([R.salida.lat,R.salida.lon]).addTo(map).bindPopup('<b>Salida común</b><br>Punto supuesto hacia la carretera 180.');
const suma=k=>R.rutas.reduce((a,r)=>a+r[k],0);const exc=R.rutas.filter(r=>r.horas>R.supuestos.HORAS_TURNO).length;
document.getElementById('kpis').innerHTML=[[Math.round(R.kmObligatorios)+' km','calles cubiertas'],[R.tramosObligatorios.toLocaleString('es-MX'),'tramos de calle'],[Math.round(suma('kmRepaso'))+' km','repasos'],[exc+' de 15','zonas sobre '+R.supuestos.HORAS_TURNO+' h']].map(k=>'<div class=kpi><b>'+k[0]+'</b>'+k[1]+'</div>').join('');
const lista=document.getElementById('lista'),activas=new Set(R.rutas.map(r=>r.ruta));
const pintar=id=>{const on=activas.has(id);on?srv[id].addTo(map):srv[id].remove();on&&verExt?ext[id].addTo(map):ext[id].remove()};
for(const r of R.rutas){const l=document.createElement('label');l.className='fila';l.dataset.turno=r.turno;l.dataset.id=r.ruta;
 l.innerHTML='<input type=checkbox checked><span class=color style="background:'+col[r.ruta]+'"></span><span class=n>'+r.ruta+'</span><span class=d>'+r.kmServicio+' km</span><span class="h'+(r.horas>R.supuestos.HORAS_TURNO?' excede':'')+'">'+r.horas+' h</span>';
 l.querySelector('input').onchange=e=>{e.target.checked?activas.add(r.ruta):activas.delete(r.ruta);pintar(r.ruta)};lista.append(l)}
document.getElementById('rep').onchange=e=>{verExt=e.target.checked;R.rutas.forEach(r=>pintar(r.ruta))};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('label.fila').forEach(l=>{const on=b.dataset.t==='todas'||l.dataset.turno===b.dataset.t;l.style.display=on?'':'none';const c=l.querySelector('input');c.checked=on;c.dispatchEvent(new Event('change'))})});
</script></body></html>`;
writeFileSync('salida/mapa-cobertura.html', html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB', sql.length, 'lineas sql');
