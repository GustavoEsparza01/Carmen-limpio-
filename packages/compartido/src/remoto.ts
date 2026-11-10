import type { Confianza, Horario, Lugar, TipoLugar } from './catalogo.ts';
import { DIAS_SEMANA, type Dia, type Turno } from './constantes.ts';
import type { AvisoCiudad, TipoAviso } from './servicios.ts';
import type { Unidad } from './unidades.ts';

// Traduce las filas de Supabase a los tipos que ya usan las pantallas. No depende de supabase-js:
// cada app hace la consulta con su cliente y pasa aquí el resultado.

export const CONSULTA_LUGARES =
  'id, nombre, tipo, horarios (ruta_id, dias, confianza, por_confirmar, rutas (numero, turno))';

export const CONSULTA_UNIDADES = 'numero, placas, estado, asignaciones (ruta_id, desde, hasta, rutas (turno))';

export const CONSULTA_AVISOS = 'id, tipo, titulo, texto, desde, hasta';

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
}

export class CatalogoInvalido extends Error {}

const TIPOS_LUGAR: readonly TipoLugar[] = ['colonia', 'fraccionamiento', 'avenida', 'calle', 'privada', 'otro'];
const CONFIANZAS: readonly Confianza[] = ['alta', 'media', 'baja', 'ninguna'];
const ordenDia = (d: Dia) => DIAS_SEMANA.indexOf(d);

// Rechaza un catálogo dudoso en lugar de mostrarlo: la app sigue con el que ya tiene.
export function lugaresDesdeFilas(filas: readonly FilaLugar[]): Lugar[] {
  if (!filas?.length) throw new CatalogoInvalido('Catálogo vacío');

  return filas
    .map((fila): Lugar => {
      if (!fila.id || !fila.nombre || !TIPOS_LUGAR.includes(fila.tipo)) {
        throw new CatalogoInvalido(`Lugar inválido: ${fila.id}`);
      }
      if (!fila.horarios?.length) throw new CatalogoInvalido(`Lugar sin horario: ${fila.nombre}`);
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
    .map((a) => ({ id: String(a.id), tipo: a.tipo, titulo: a.titulo, texto: a.texto }));
}
