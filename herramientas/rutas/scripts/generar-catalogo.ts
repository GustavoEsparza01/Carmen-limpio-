// Genera el catálogo de consulta para las apps desde los carteles. Ejecutar desde herramientas/rutas.
import { readFileSync, writeFileSync } from 'node:fs';
import { idLugar } from '../../../packages/compartido/src/busqueda.ts';

const cat = JSON.parse(readFileSync('data/rutas.json', 'utf8'));
const ubic = JSON.parse(readFileSync('data/ubicaciones.json', 'utf8'));

function tipoDe(nombre: string): string {
  if (/^(frac\.|fraccionamiento)/i.test(nombre)) return 'fraccionamiento';
  if (/^(av\.|avenida)/i.test(nombre)) return 'avenida';
  if (/^(priv\.|privadas?)/i.test(nombre)) return 'privada';
  if (/^calle/i.test(nombre)) return 'calle';
  if (/^colonia/i.test(nombre)) return 'colonia';
  return 'otro';
}

const lugares = new Map<string, any>();
for (const r of cat.rutas) {
  for (const l of r.lugares) {
    const nombre = typeof l === 'string' ? l : l.nombre;
    const id = idLugar(nombre);
    if (!lugares.has(id)) lugares.set(id, { id, nombre, tipo: tipoDe(nombre), horarios: [] });
    const confianza = ubic[r.id]?.[nombre]?.conf;
    if (!confianza) throw new Error(`Sin confianza: ${r.id} ${nombre}`);
    lugares.get(id).horarios.push({
      rutaId: r.id,
      numero: r.numero,
      turno: r.turno,
      dias: l.dias ?? cat.dias,
      confianza,
      porConfirmar: /se infiere/i.test(l.nota ?? ''),
    });
  }
}

const orden = [...lugares.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const entradas = orden.reduce((n, l) => n + l.horarios.length, 0);
writeFileSync(
  '../../packages/compartido/src/catalogo.generado.ts',
  `// Generado por herramientas/rutas/scripts/generar-catalogo.ts. No editar a mano.
import type { Lugar } from './catalogo.ts';

export const LUGARES: Lugar[] = ${JSON.stringify(orden, null, 2)};
`,
);
console.log(`lugares ${orden.length}, entradas ${entradas}`);
