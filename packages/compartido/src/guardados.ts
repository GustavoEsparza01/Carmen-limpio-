export type EtiquetaLugar = 'casa' | 'trabajo' | 'otro';
export type Recordatorio = 'ninguno' | 'nocheAnterior' | 'antesDeVentana';

export interface LugarGuardado {
  lugarId: string;
  etiqueta: EtiquetaLugar;
  recordatorio: Recordatorio;
}

export const NOMBRE_ETIQUETA: Record<EtiquetaLugar, string> = {
  casa: 'Casa',
  trabajo: 'Trabajo',
  otro: 'Otro',
};

export const NOMBRE_RECORDATORIO: Record<Recordatorio, string> = {
  ninguno: 'Sin recordatorio',
  nocheAnterior: 'La noche anterior',
  antesDeVentana: 'Antes de la ventana',
};

const ETIQUETAS: readonly string[] = ['casa', 'trabajo', 'otro'];
const RECORDATORIOS: readonly string[] = ['ninguno', 'nocheAnterior', 'antesDeVentana'];

function esGuardado(valor: unknown): valor is LugarGuardado {
  if (typeof valor !== 'object' || valor === null) return false;
  const { lugarId, etiqueta, recordatorio } = valor as Partial<LugarGuardado>;
  return (
    typeof lugarId === 'string' &&
    lugarId.length > 0 &&
    ETIQUETAS.includes(etiqueta ?? '') &&
    RECORDATORIOS.includes(recordatorio ?? '')
  );
}

function leerLista(texto: string): LugarGuardado[] | null {
  try {
    const datos: unknown = JSON.parse(texto);
    return Array.isArray(datos) ? datos.filter(esGuardado) : null;
  } catch {
    return null;
  }
}

// El formato anterior guardaba solo el id de un lugar: se conserva como "casa".
export function migrarGuardados(guardados: string | null, favoritaAnterior: string | null): LugarGuardado[] {
  const lista = guardados === null ? null : leerLista(guardados);
  if (lista) return lista;
  return favoritaAnterior ? [{ lugarId: favoritaAnterior, etiqueta: 'casa', recordatorio: 'ninguno' }] : [];
}

export function guardarLugar(lista: readonly LugarGuardado[], lugarId: string, etiqueta: EtiquetaLugar): LugarGuardado[] {
  const existente = lista.find((g) => g.lugarId === lugarId);
  if (existente) return lista.map((g) => (g === existente ? { ...g, etiqueta } : g));
  return [...lista, { lugarId, etiqueta, recordatorio: 'ninguno' }];
}

export function quitarLugar(lista: readonly LugarGuardado[], lugarId: string): LugarGuardado[] {
  return lista.filter((g) => g.lugarId !== lugarId);
}

export function cambiarRecordatorio(
  lista: readonly LugarGuardado[],
  lugarId: string,
  recordatorio: Recordatorio,
): LugarGuardado[] {
  return lista.map((g) => (g.lugarId === lugarId ? { ...g, recordatorio } : g));
}
