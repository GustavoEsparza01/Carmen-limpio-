import {
  HISTORIAL_MAXIMO,
  LARGO_MAXIMO_HISTORIAL,
  VERSION_AVISO_ASISTENTE,
  type FallaAsistente,
  type MensajeAsistente,
} from '@carmen-limpio/compartido';
import { FunctionsHttpError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { conLimite, supabase } from './supabase';

const CLAVE_AVISO = 'carmen-limpio:asistente:aviso';
const CLAVE_DISPOSITIVO = 'carmen-limpio:asistente:dispositivo';
const LIMITE_MS = 25_000;

export class ErrorAsistente extends Error {
  readonly falla: FallaAsistente;

  constructor(falla: FallaAsistente) {
    super(falla);
    this.falla = falla;
  }
}

export async function avisoAceptado(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLAVE_AVISO)) === VERSION_AVISO_ASISTENTE;
}

export async function aceptarAviso(): Promise<void> {
  await AsyncStorage.setItem(CLAVE_AVISO, VERSION_AVISO_ASISTENTE);
}

// Solo distingue un teléfono de otro para repartir la cuota: no es un secreto ni identifica a nadie.
function uuidAleatorio(): string {
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

async function idDispositivo(): Promise<string> {
  const guardado = await AsyncStorage.getItem(CLAVE_DISPOSITIVO);
  if (guardado) return guardado;
  const nuevo = uuidAleatorio();
  await AsyncStorage.setItem(CLAVE_DISPOSITIVO, nuevo);
  return nuevo;
}

const FALLAS: readonly string[] = ['dispositivo', 'diario', 'ocupado', 'invalida'];

async function fallaDe(error: unknown): Promise<FallaAsistente> {
  if (!(error instanceof FunctionsHttpError)) return 'conexion';
  try {
    const { error: motivo } = (await (error.context as Response).json()) as { error?: string };
    if (motivo && FALLAS.includes(motivo)) return motivo as FallaAsistente;
  } catch {
    // Una respuesta sin el formato esperado se trata como servicio no disponible.
  }
  return 'ocupado';
}

export async function preguntarIA(pregunta: string, anteriores: readonly MensajeAsistente[]): Promise<string> {
  if (!supabase) throw new ErrorAsistente('ocupado');
  const historial = anteriores
    .slice(-HISTORIAL_MAXIMO)
    .map(({ de, texto }) => ({ de, texto: texto.slice(0, LARGO_MAXIMO_HISTORIAL) }));
  const cuerpo = { dispositivo: await idDispositivo(), historial, pregunta };

  let resultado;
  try {
    resultado = await conLimite(supabase.functions.invoke('asistente', { body: cuerpo }), LIMITE_MS);
  } catch {
    throw new ErrorAsistente('conexion');
  }
  if (resultado.error) throw new ErrorAsistente(await fallaDe(resultado.error));
  const respuesta = (resultado.data as { respuesta?: unknown } | null)?.respuesta;
  if (typeof respuesta !== 'string' || !respuesta) throw new ErrorAsistente('ocupado');
  return respuesta;
}
