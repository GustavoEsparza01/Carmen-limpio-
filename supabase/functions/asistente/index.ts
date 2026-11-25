// Función de Supabase (Deno). La clave de Gemini es un secreto del proyecto y la service_role solo existe aquí.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { textoDatos, type FilaAviso, type FilaLugar } from './contexto.ts';
import { manejar, type Cupo } from './manejador.ts';
import { gemini, ProveedorNoDisponible, type Proveedor } from './proveedor.ts';

const entorno = (nombre: string) => Deno.env.get(nombre) ?? '';
const entero = (nombre: string, omision: number) => {
  const valor = Number(entorno(nombre));
  return Number.isInteger(valor) && valor > 0 ? valor : omision;
};

const LIMITE_DISPOSITIVO = entero('ASISTENTE_LIMITE_DISPOSITIVO', 15);
// Debe quedar por debajo de la cuota diaria de AI Studio (500 para gemini-3.5-flash-lite al 2026-11-24).
const LIMITE_DIARIO = entero('ASISTENTE_LIMITE_DIARIO', 400);
const VIGENCIA_DATOS_MS = 5 * 60_000;

const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } };
// Con la clave anon la RLS deja ver solo lo público: avisos publicados y nunca la propuesta.
const publico = createClient(entorno('SUPABASE_URL'), entorno('SUPABASE_ANON_KEY'), sinSesion);
const interno = createClient(entorno('SUPABASE_URL'), entorno('SUPABASE_SERVICE_ROLE_KEY'), sinSesion);

let guardados: { texto: string; hasta: number } | null = null;

async function datos(): Promise<string> {
  const ahora = Date.now();
  if (guardados && guardados.hasta > ahora) return guardados.texto;
  const instante = new Date(ahora).toISOString();
  const [lugares, avisos] = await Promise.all([
    publico.from('lugares').select('nombre, horarios (ruta_id, dias, inicio, fin, por_confirmar)'),
    publico
      .from('avisos')
      .select('titulo, texto, avisos_lugares (lugares (nombre))')
      .eq('publicado', true)
      .lte('desde', instante)
      .or(`hasta.is.null,hasta.gt.${instante}`)
      .order('desde', { ascending: false })
      .limit(20),
  ]);
  if (lugares.error || avisos.error) throw new Error('No se pudieron leer los datos públicos');
  // Sin catálogo la IA no tendría con qué contestar.
  if (!lugares.data.length) throw new Error('Catálogo vacío');
  const texto = textoDatos(lugares.data as unknown as FilaLugar[], avisos.data as unknown as FilaAviso[]);
  guardados = { texto, hasta: ahora + VIGENCIA_DATOS_MS };
  return texto;
}

async function apartar(dispositivo: string): Promise<Cupo> {
  const { data, error } = await interno.rpc('registrar_pregunta', {
    p_dispositivo: dispositivo,
    p_limite_dispositivo: LIMITE_DISPOSITIVO,
    p_limite_diario: LIMITE_DIARIO,
  });
  if (error) throw new Error('No se pudo registrar la pregunta');
  return data as Cupo;
}

const clave = entorno('GEMINI_API_KEY');
const proveedor: Proveedor = clave
  ? gemini(clave, entorno('GEMINI_MODELO') || 'gemini-3.5-flash-lite')
  : () => Promise.reject(new ProveedorNoDisponible('Falta GEMINI_API_KEY'));

Deno.serve((peticion) =>
  manejar(peticion, {
    ahora: () => new Date(),
    apartar,
    datos,
    proveedor,
    registrar: (mensaje) => console.error(`asistente: ${mensaje}`),
  }),
);
