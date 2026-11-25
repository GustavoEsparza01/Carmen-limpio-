import { instrucciones, ocultarDatos, revisarRespuesta } from './contexto.ts';
import type { Mensaje, Proveedor } from './proveedor.ts';

// Iguales a los de packages/compartido/src/asistente.ts (hay una prueba que los compara).
export const LARGO_MAXIMO_PREGUNTA = 300;
export const HISTORIAL_MAXIMO = 6;
export const LARGO_MAXIMO_HISTORIAL = 800;

const CUERPO_MAXIMO = 16_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Cupo = 'ok' | 'dispositivo' | 'diario';

export interface Dependencias {
  // Horarios y avisos públicos, ya en texto.
  datos: () => Promise<string>;
  apartar: (dispositivo: string) => Promise<Cupo>;
  proveedor: Proveedor;
  ahora: () => Date;
  registrar: (mensaje: string) => void;
}

const json = (cuerpo: unknown, estado = 200) => Response.json(cuerpo, { status: estado });
const falla = (error: string, estado: number) => json({ error }, estado);

interface Pregunta {
  dispositivo: string;
  mensajes: Mensaje[];
}

function leer(cuerpo: unknown): Pregunta | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const { dispositivo, pregunta, historial = [] } = cuerpo as Record<string, unknown>;
  if (typeof dispositivo !== 'string' || !UUID.test(dispositivo)) return null;
  if (typeof pregunta !== 'string' || !Array.isArray(historial) || historial.length > HISTORIAL_MAXIMO) return null;
  const actual = pregunta.trim();
  if (!actual || actual.length > LARGO_MAXIMO_PREGUNTA) return null;

  const anteriores: Mensaje[] = [];
  for (const m of historial as unknown[]) {
    if (typeof m !== 'object' || m === null) return null;
    const { de, texto } = m as Record<string, unknown>;
    if ((de !== 'persona' && de !== 'asistente') || typeof texto !== 'string') return null;
    if (!texto || texto.length > LARGO_MAXIMO_HISTORIAL) return null;
    anteriores.push({ de, texto });
  }
  // La conversación empieza con la persona.
  while (anteriores[0]?.de === 'asistente') anteriores.shift();
  return {
    dispositivo,
    mensajes: [...anteriores, { de: 'persona' as const, texto: actual }].map((m) => ({ ...m, texto: ocultarDatos(m.texto) })),
  };
}

export async function manejar(peticion: Request, dep: Dependencias): Promise<Response> {
  if (peticion.method !== 'POST') return falla('invalida', 405);
  let pregunta: Pregunta | null = null;
  try {
    const texto = await peticion.text();
    if (texto.length <= CUERPO_MAXIMO) pregunta = leer(JSON.parse(texto));
  } catch {
    // Un cuerpo ilegible es una petición inválida.
  }
  if (!pregunta) return falla('invalida', 400);

  // En los registros va el motivo, nunca lo que se preguntó ni lo que se contestó.
  try {
    const datos = await dep.datos();
    const cupo = await dep.apartar(pregunta.dispositivo);
    if (cupo !== 'ok') return falla(cupo, 429);
    const texto = await dep.proveedor({ instrucciones: instrucciones(datos, dep.ahora()), mensajes: pregunta.mensajes });
    return json({ respuesta: revisarRespuesta(texto, datos) });
  } catch (e) {
    dep.registrar(e instanceof Error ? e.message : 'Error desconocido');
    return falla('ocupado', 503);
  }
}
