import { lugarPorId, type Confianza, type Horario, type Lugar, type TipoLugar } from './catalogo.ts';
import { DIAS_SEMANA, type Dia, type Turno } from './constantes.ts';
import type { AvisoCiudad, TipoAviso } from './servicios.ts';
import type { Unidad } from './unidades.ts';
import type { BorradorReporte, EstadoReporte, Reporte, TipoReporte } from './reportes.ts';
import type { Coordenadas } from './trazado.ts';

// Traduce las filas de Supabase a los tipos que ya usan las pantallas. No depende de supabase-js:
// cada app hace la consulta con su cliente y pasa aquí el resultado.

export const CONSULTA_LUGARES =
  'id, nombre, tipo, horarios (ruta_id, dias, confianza, por_confirmar, rutas (numero, turno))';

export const CONSULTA_UNIDADES = 'numero, placas, estado, asignaciones (ruta_id, desde, hasta, rutas (turno))';

export const CONSULTA_AVISOS = 'id, tipo, titulo, texto, desde, hasta, imagen, imagen_alt, avisos_lugares (lugar_id)';

export interface FilaLugar {
  id: string;
  nombre: string;
  tipo: TipoLugar;
  horarios: {
    ruta_id: string;
    dias: Dia[];
    confianza: Confianza;
    por_confirmar: boolean;
    rutas: { numero: number; turno: Turno } | null;
  }[];
}

export interface FilaUnidad {
  numero: number;
  placas: string | null;
  estado: string;
  asignaciones: { ruta_id: string; desde: string; hasta: string | null; rutas: { turno: Turno } | null }[];
}

export interface FilaAviso {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  desde: string;
  hasta: string | null;
  imagen: string | null;
  imagen_alt: string | null;
  avisos_lugares: { lugar_id: string }[];
}

export class CatalogoInvalido extends Error {}

const TIPOS_LUGAR: readonly TipoLugar[] = ['colonia', 'fraccionamiento', 'avenida', 'calle', 'privada', 'otro'];
const CONFIANZAS: readonly Confianza[] = ['alta', 'media', 'baja', 'ninguna'];
const ordenDia = (d: Dia) => DIAS_SEMANA.indexOf(d);

// Rechaza un catálogo dudoso en lugar de mostrarlo: la app sigue con el que ya tiene.
// Un lugar sin horario no es un error: el panel puede quitarlo de su última ruta, y sin días no hay nada que consultar.
export function lugaresDesdeFilas(filas: readonly FilaLugar[]): Lugar[] {
  const conHorario = (filas ?? []).filter((fila) => fila.horarios?.length);
  if (!conHorario.length) throw new CatalogoInvalido('Catálogo vacío');

  return conHorario
    .map((fila): Lugar => {
      if (!fila.id || !fila.nombre || !TIPOS_LUGAR.includes(fila.tipo)) {
        throw new CatalogoInvalido(`Lugar inválido: ${fila.id}`);
      }
      const horarios = fila.horarios
        .map((h): Horario => {
          if (!h.rutas || !h.dias?.length || !h.dias.every((d) => DIAS_SEMANA.includes(d)) || !CONFIANZAS.includes(h.confianza)) {
            throw new CatalogoInvalido(`Horario inválido: ${fila.nombre} ${h.ruta_id}`);
          }
          return {
            rutaId: h.ruta_id,
            numero: h.rutas.numero,
            turno: h.rutas.turno,
            dias: [...h.dias].sort((a, b) => ordenDia(a) - ordenDia(b)),
            confianza: h.confianza,
            porConfirmar: h.por_confirmar,
          };
        })
        .sort((a, b) => a.rutaId.localeCompare(b.rutaId));
      return { id: fila.id, nombre: fila.nombre, tipo: fila.tipo, horarios };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export interface UnidadRemota extends Unidad {
  placas: string | null;
  estado: string;
}

// Solo cuentan las asignaciones vigentes en la fecha dada (AAAA-MM-DD, hora de Mérida).
export function unidadesDesdeFilas(filas: readonly FilaUnidad[], hoy: string): UnidadRemota[] {
  return [...filas]
    .sort((a, b) => a.numero - b.numero)
    .map((u) => {
      const vigentes = u.asignaciones.filter((a) => a.desde <= hoy && (a.hasta === null || a.hasta >= hoy));
      const de = (turno: Turno) => vigentes.find((a) => a.rutas?.turno === turno)?.ruta_id ?? null;
      return { numero: u.numero, matutina: de('matutino'), vespertina: de('vespertino'), placas: u.placas, estado: u.estado };
    });
}

// Solo avisos vigentes en el instante dado; los más recientes primero.
export function avisosDesdeFilas(filas: readonly FilaAviso[], ahora: Date): AvisoCiudad[] {
  const t = ahora.getTime();
  return filas
    .filter((a) => Date.parse(a.desde) <= t && (a.hasta === null || Date.parse(a.hasta) > t))
    .sort((a, b) => Date.parse(b.desde) - Date.parse(a.desde))
    .map((a) => ({
      id: String(a.id),
      tipo: a.tipo,
      titulo: a.titulo,
      texto: a.texto,
      // Sin lugares, el aviso es para toda la ciudad. Un lugar que ya no está en el catálogo se omite.
      lugares: (a.avisos_lugares ?? [])
        .map((l) => lugarPorId(l.lugar_id)?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre))
        .sort((x, y) => x.localeCompare(y, 'es')),
      imagen: a.imagen ? { ruta: a.imagen, descripcion: a.imagen_alt ?? '' } : null,
    }));
}

// Reportes ------------------------------------------------------------------

// La vista reportes_detalle da longitud y latitud; la RLS limita a los propios (o todos, para administración).
export const CONSULTA_REPORTES =
  'id, tipo, lugar_id, fecha, lng, lat, descripcion, foto, estado, nota, creado, historial_reportes (estado, nota, fecha)';

export interface FilaReporte {
  id: string;
  tipo: TipoReporte;
  lugar_id: string | null;
  fecha: string | null;
  lng: number | null;
  lat: number | null;
  descripcion: string | null;
  foto: string | null;
  estado: EstadoReporte;
  nota: string;
  creado: string;
  historial_reportes: { estado: EstadoReporte; nota: string; fecha: string }[] | null;
}

// Más recientes primero; el historial, en orden de ocurrencia.
export function reportesDesdeFilas(filas: readonly FilaReporte[]): Reporte[] {
  return [...filas]
    .sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado))
    .map((f) => ({
      id: f.id,
      tipo: f.tipo,
      ...(f.lugar_id ? { lugarId: f.lugar_id } : {}),
      ...(f.fecha ? { fecha: f.fecha } : {}),
      ...(f.lng !== null && f.lat !== null ? { punto: [f.lng, f.lat] as Coordenadas } : {}),
      ...(f.descripcion ? { descripcion: f.descripcion } : {}),
      ...(f.foto ? { foto: f.foto } : {}),
      creado: f.creado,
      estado: f.estado,
      nota: f.nota,
      historial: [...(f.historial_reportes ?? [])]
        .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))
        .map(({ estado, nota, fecha }) => ({ estado, nota, fecha })),
    }));
}

export interface FilaNuevoReporte {
  tipo: TipoReporte;
  lugar_id: string | null;
  fecha: string | null;
  // EWKT: PostGIS lo convierte a geometry al insertar.
  ubicacion: string | null;
  descripcion: string | null;
  foto: string | null;
}

// Solo los campos que pide cada tipo. Estado, nota, autor e incidencia los pone la base.
export function filaNuevoReporte(borrador: BorradorReporte, foto: string | null): FilaNuevoReporte {
  const descripcion = borrador.descripcion?.trim();
  const usaDescripcion = borrador.tipo !== 'noPaso';
  return {
    tipo: borrador.tipo,
    lugar_id: borrador.tipo !== 'tiradero' ? (borrador.lugarId ?? null) : null,
    fecha: borrador.tipo === 'noPaso' ? (borrador.fecha ?? null) : null,
    ubicacion:
      borrador.tipo === 'tiradero' && borrador.punto ? `SRID=4326;POINT(${borrador.punto[0]} ${borrador.punto[1]})` : null,
    descripcion: usaDescripcion && descripcion ? descripcion : null,
    foto: usaDescripcion ? foto : null,
  };
}

// Asignaciones -----------------------------------------------------------------

// Fecha AAAA-MM-DD del día anterior, sin depender de la zona horaria.
export function diaAnterior(fecha: string): string {
  const instante = new Date(`${fecha}T12:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() - 1);
  return instante.toISOString().slice(0, 10);
}

export type PlanAsignacion =
  | { tipo: 'igual' }
  // La asignación vigente empezó hoy: se corrige en su lugar, no hay historial que guardar.
  | { tipo: 'corregir'; id: number }
  // Se cierra la vigente ayer y la nueva empieza hoy, para conservar quién cubrió la ruta antes.
  | { tipo: 'relevar'; cerrarId: number | null; hasta: string | null };

export function planAsignacion(
  vigente: { id: number; unidad: number; desde: string } | null,
  nuevaUnidad: number,
  hoy: string,
): PlanAsignacion {
  if (vigente?.unidad === nuevaUnidad) return { tipo: 'igual' };
  if (vigente && vigente.desde >= hoy) return { tipo: 'corregir', id: vigente.id };
  return { tipo: 'relevar', cerrarId: vigente?.id ?? null, hasta: vigente ? diaAnterior(hoy) : null };
}
