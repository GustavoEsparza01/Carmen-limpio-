// Genera los datos de comparación del panel. Ejecutar desde herramientas/rutas.
// Solo cifras: la geometría de `propuesta` ya no se publica como archivo; el panel la pide a Supabase,
// donde la RLS la reserva a administración.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const leer = (archivo: string) => JSON.parse(readFileSync(archivo, 'utf8'));
const destino = '../../apps/panel/public/datos';

const cobertura = leer('salida/cobertura.geojson');
const servicio = cobertura.features.filter((f: any) => f.properties.tramo === 'servicio');

const carteles = leer('salida/resumen.json').resumen;
const propuesta = leer('salida/resumen-cobertura.json');
const rutas = carteles.map((r: any) => {
  const zona = propuesta.rutas.find((z: any) => z.ruta === r.ruta);
  if (!zona) throw new Error(`Sin zona en la propuesta: ${r.ruta}`);
  return {
    id: r.ruta,
    turno: r.turno,
    carteles: { kmServicio: r.kmServicio, kmTraslado: r.kmTraslado },
    propuesta: { kmServicio: zona.kmServicio, kmRepaso: zona.kmRepaso, kmAcceso: zona.kmAcceso, horas: zona.horas },
  };
});
if (rutas.length !== 15 || servicio.length !== 15) throw new Error('Se esperaban 15 rutas y 15 zonas');

mkdirSync(destino, { recursive: true });
writeFileSync(
  `${destino}/escenarios.json`,
  JSON.stringify({
    kmObligatorios: propuesta.kmObligatorios,
    excluidosKm: propuesta.excluidosKm,
    supuestos: propuesta.supuestos,
    rutas,
  }),
);
console.log(`zonas ${servicio.length}, rutas ${rutas.length}`);
