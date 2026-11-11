import { DIAS_SEMANA } from './constantes.ts';
import { diaDeFecha, fechaEnMerida, type EstadoReporte, type Reporte, type TipoReporte } from './reportes.ts';
import { ubicacionDeLugar, type Coordenadas } from './trazado.ts';

// Estadísticas del panel. Se calculan con los mismos reportes que muestra la sección Reportes,
// para que las cifras coincidan con lo guardado.

const TIPOS: readonly TipoReporte[] = ['noPaso', 'acumulacion', 'tiradero'];
const ESTADOS: readonly EstadoReporte[] = ['recibido', 'enRevision', 'atendido', 'rechazado'];
const SEMANAS = 8;

export interface ReporteParaEstadistica
  extends Pick<Reporte, 'tipo' | 'estado' | 'creado' | 'lugarId' | 'punto' | 'historial'> {
  incidenciaId: number | null;
}

export interface Estadisticas {
  total: number;
  pendientes: number;
  porEstado: Record<EstadoReporte, number>;
  porTipo: Record<TipoReporte, Record<EstadoReporte, number>>;
  incidencias: number;
  // Mediana de horas entre el envío y el cierre (atendido o rechazado). null si aún no hay cerrados.
  horasMedianaCierre: number | null;
  // Lunes de cada semana (AAAA-MM-DD, hora de Mérida), de la más antigua a la actual.
  porSemana: { lunes: string; total: number }[];
  lugares: { lugarId: string; total: number }[];
  // Para el mapa de calor: el punto marcado o, si no hay, la ubicación del lugar.
  puntos: { coordenadas: Coordenadas; peso: number }[];
  sinUbicacion: number;
}

const vacio = <T extends string>(claves: readonly T[]) =>
  Object.fromEntries(claves.map((c) => [c, 0])) as Record<T, number>;

function sumarDias(fecha: string, dias: number): string {
  const instante = new Date(`${fecha}T12:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() + dias);
  return instante.toISOString().slice(0, 10);
}

export function lunesDe(fecha: string): string {
  return sumarDias(fecha, -DIAS_SEMANA.indexOf(diaDeFecha(fecha)));
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

export function calcularEstadisticas(reportes: readonly ReporteParaEstadistica[], ahora: Date): Estadisticas {
  const porEstado = vacio(ESTADOS);
  const porTipo = Object.fromEntries(TIPOS.map((t) => [t, vacio(ESTADOS)])) as Record<
    TipoReporte,
    Record<EstadoReporte, number>
  >;
  const incidencias = new Set<number>();
  const cierres: number[] = [];
  const lugares = new Map<string, number>();
  const puntos = new Map<string, { coordenadas: Coordenadas; peso: number }>();
  let sinUbicacion = 0;

  const actual = lunesDe(fechaEnMerida(ahora));
  const semanas = Array.from({ length: SEMANAS }, (_, i) => sumarDias(actual, -7 * (SEMANAS - 1 - i)));
  const porSemana = new Map(semanas.map((s) => [s, 0]));

  for (const r of reportes) {
    porEstado[r.estado]++;
    porTipo[r.tipo][r.estado]++;
    if (r.incidenciaId !== null) incidencias.add(r.incidenciaId);

    const cierre = r.historial.find((e) => e.estado === 'atendido' || e.estado === 'rechazado');
    if (cierre) cierres.push((Date.parse(cierre.fecha) - Date.parse(r.creado)) / 3_600_000);

    const semana = lunesDe(fechaEnMerida(new Date(r.creado)));
    if (porSemana.has(semana)) porSemana.set(semana, porSemana.get(semana)! + 1);

    if (r.lugarId) lugares.set(r.lugarId, (lugares.get(r.lugarId) ?? 0) + 1);

    const coordenadas = r.punto ?? (r.lugarId ? ubicacionDeLugar(r.lugarId) : undefined);
    if (!coordenadas) {
      sinUbicacion++;
      continue;
    }
    const clave = coordenadas.join(',');
    const previo = puntos.get(clave);
    puntos.set(clave, { coordenadas, peso: (previo?.peso ?? 0) + 1 });
  }

  return {
    total: reportes.length,
    pendientes: porEstado.recibido + porEstado.enRevision,
    porEstado,
    porTipo,
    incidencias: incidencias.size,
    horasMedianaCierre: mediana(cierres),
    porSemana: semanas.map((lunes) => ({ lunes, total: porSemana.get(lunes)! })),
    lugares: [...lugares.entries()]
      .map(([lugarId, total]) => ({ lugarId, total }))
      .sort((a, b) => b.total - a.total || a.lugarId.localeCompare(b.lugarId))
      .slice(0, 5),
    puntos: [...puntos.values()],
    sinUbicacion,
  };
}
