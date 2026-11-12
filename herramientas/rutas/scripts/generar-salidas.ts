// Genera el mapa Leaflet de revisión a partir de salida/*: node scripts/generar-salidas.ts. El seed lo escribe generar-seed.ts.
import { readFileSync, writeFileSync } from 'node:fs';
const rutas = JSON.parse(readFileSync('salida/rutas.geojson', 'utf8'));
const paradas = JSON.parse(readFileSync('salida/paradas.geojson', 'utf8'));
const { salida, resumen } = JSON.parse(readFileSync('salida/resumen.json', 'utf8'));


// --- Mapa de revisión ---
const datos = JSON.stringify({ rutas, paradas, resumen, salida }).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carmen Limpio · Trazado de rutas (borrador)</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0;font:14px/1.4 system-ui,Segoe UI,sans-serif;color:#1f2d2a}
#app{display:flex;height:100%}#panel{width:340px;flex:none;overflow:auto;padding:16px;background:#f6f8f7;border-right:1px solid #d9e2de}
#map{flex:1;min-width:0}h1{font-size:18px;margin:0 0 2px;color:#17694f}.sub{color:#5b6b66;font-size:12px;margin:0 0 10px}
.aviso{background:#fff4d6;border:1px solid #edd68c;border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:12px}
.tabs{display:flex;gap:4px;margin-bottom:10px}.tabs button{flex:1;padding:6px 4px;border:1px solid #c9d5d0;background:#fff;border-radius:5px;cursor:pointer;font:inherit;font-size:12px}
.tabs button.on{background:#17694f;color:#fff;border-color:#17694f}
label.fila{display:flex;align-items:center;gap:6px;padding:5px 2px;border-bottom:1px solid #e6ecea;cursor:pointer}
.color{width:14px;height:14px;border-radius:3px;flex:none}.fila .n{font-weight:600;width:30px}.fila .d{margin-left:auto;font-size:12px;color:#5b6b66;text-align:right}
.falta{color:#b4531f}h2{font-size:13px;margin:14px 0 4px}.ley{font-size:12px;color:#5b6b66}.ley span{display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 3px 0 8px}
.ley span:first-child{margin-left:0}details{margin-top:8px;font-size:12px}summary{cursor:pointer;font-weight:600}
@media(max-width:700px){#app{flex-direction:column}#panel{width:100%;height:45%;border-right:0;border-bottom:1px solid #d9e2de}}
</style></head><body><div id="app"><aside id="panel">
<h1>Carmen Limpio</h1><p class="sub">Trazado preliminar de las 15 rutas de recolección</p>
<div class="aviso"><b>Borrador sin validar.</b> Los carteles solo nombran lugares. El orden y las calles son una estimación calculada, no el recorrido oficial de los camiones.</div>
<div class="tabs"><button data-t="todas" class="on">Todas</button><button data-t="matutino">Matutino</button><button data-t="vespertino">Vespertino</button></div>
<div id="lista"></div>
<h2>Confianza de ubicación</h2><div class="ley"><span style="background:#1a9850"></span>alta<span style="background:#e6a100"></span>media<span style="background:#d73027"></span>baja</div>
<div class="ley" style="margin-top:6px">Línea continua: servicio. Punteada: traslado desde y hacia la salida.</div>
<div id="faltan"></div></aside><div id="map" role="application" aria-label="Mapa de rutas"></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const D=${datos};
const COL=['#1b7837','#2166ac','#b2182b','#7b3294','#e08214','#01818a','#c51b7d','#5a5a00'];
const color=id=>COL[(+id.slice(1)-1)%8];
const map=L.map('map',{preferCanvas:true}).setView([18.652,-91.80],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
const capas={};
for(const r of D.resumen){const g=L.layerGroup();capas[r.ruta]=g;
 D.rutas.features.filter(f=>f.properties.ruta===r.ruta).forEach(f=>{const srv=f.properties.tramo==='servicio';
  L.geoJSON(f,{style:{color:color(r.ruta),weight:srv?4:2,opacity:srv?.9:.45,dashArray:srv?(r.turno==='vespertino'?'10 5':null):'3 6'}}).bindPopup('<b>'+r.ruta+'</b> · '+f.properties.tramo+' · '+f.properties.km+' km').addTo(g)});
 D.paradas.features.filter(f=>f.properties.ruta===r.ruta).forEach(f=>{const p=f.properties,c={alta:'#1a9850',media:'#e6a100',baja:'#d73027'}[p.confianza];
  L.circleMarker([f.geometry.coordinates[1],f.geometry.coordinates[0]],{radius:5,color:'#fff',weight:1,fillColor:c,fillOpacity:1}).bindPopup('<b>'+r.ruta+' · #'+p.orden+'</b><br>'+p.lugar+'<br>Confianza: '+p.confianza).addTo(g)});
 g.addTo(map)}
L.marker([D.salida.lat,D.salida.lon]).addTo(map).bindPopup('<b>Salida común</b><br>Punto supuesto hacia la carretera 180. No es la ubicación del relleno ni de la base.');
const lista=document.getElementById('lista');
for(const r of D.resumen){const l=document.createElement('label');l.className='fila';l.dataset.turno=r.turno;
 l.innerHTML='<input type=checkbox checked><span class=color style="background:'+color(r.ruta)+'"></span><span class=n>'+r.ruta+'</span><span class=d>'+r.ubicados+'/'+r.lugares+' lugares · '+r.kmServicio+' km</span>';
 l.querySelector('input').onchange=e=>e.target.checked?capas[r.ruta].addTo(map):capas[r.ruta].remove();lista.append(l)}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('label.fila').forEach(l=>{const on=b.dataset.t==='todas'||l.dataset.turno===b.dataset.t;l.style.display=on?'':'none';const c=l.querySelector('input');c.checked=on;c.dispatchEvent(new Event('change'))})});
const pend=D.resumen.filter(r=>r.faltan.length);const tot=pend.reduce((a,r)=>a+r.faltan.length,0);
document.getElementById('faltan').innerHTML='<h2 class=falta>'+tot+' lugares sin ubicar</h2>'+pend.map(r=>'<details><summary>'+r.ruta+' ('+r.faltan.length+')</summary>'+r.faltan.join(', ')+'</details>').join('');
</script></body></html>`;
writeFileSync('salida/mapa-rutas.html', html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB html');
