import { palabras, sinFaltas } from './busqueda.ts';
import { etiquetaRuta, LUGARES, type Lugar } from './catalogo.ts';
import { AVISO_FUENTE_HOY, AVISO_POR_CONFIRMAR } from './constantes.ts';
import { textoHorario } from './horario.ts';
import { estadoDeHoy } from './hoy.ts';

// Las preguntas de horario se responden aquí, con el catálogo y sin IA: no gastan cuota,
// funcionan sin conexión y no pueden inventar un horario. Lo demás va a la función `asistente`.

export const LARGO_MAXIMO_PREGUNTA = 300;
// Mensajes anteriores que se envían como contexto.
export const HISTORIAL_MAXIMO = 6;
export const LARGO_MAXIMO_HISTORIAL = 800;

// Cambia la versión cuando cambie el texto: el asistente pedirá aceptarlo de nuevo.
export const VERSION_AVISO_ASISTENTE = '2026-11-24-voz';
export const AVISO_ASISTENTE: readonly string[] = [
  'Los horarios se responden con los datos de la app. Para lo demás, tu pregunta y los mensajes anteriores de la charla se envían a Gemini, un servicio de Google.',
  'Con el plan gratuito, Google puede usar lo que escribas para mejorar sus productos y una persona puede leerlo.',
  'Si usas el micrófono, tu teléfono convierte tu voz en texto y lee la respuesta. Según el equipo, puede enviar el audio y la respuesta a su proveedor de voz, como Google. Nosotros no recibimos ni guardamos el audio.',
  'No escribas ni digas tu nombre, dirección, teléfono, correo ni otros datos personales.',
  'Es una demostración para mayores de 18 años. La IA puede equivocarse y no es un canal oficial.',
];
export const AVISO_ASISTENTE_CORTO = 'La IA puede equivocarse. No compartas datos personales. App no oficial.';

export type FallaAsistente = 'dispositivo' | 'diario' | 'ocupado' | 'invalida' | 'conexion';

export const TEXTO_FALLA_ASISTENTE: Record<FallaAsistente, string> = {
  dispositivo: 'Llegaste al límite de preguntas de hoy. Los horarios siguen disponibles.',
  diario: 'El asistente llegó a su límite de hoy. Los horarios siguen disponibles.',
  ocupado: 'El asistente no está disponible en este momento. Los horarios siguen disponibles.',
  invalida: 'No pude leer la pregunta. Intenta con una más corta.',
  conexion: 'No pudimos conectar con el asistente. Revisa tu conexión; los horarios siguen disponibles.',
};

export type FallaVoz = 'permiso' | 'noDisponible' | 'sinVoz' | 'idioma' | 'conexion' | 'sinLectura' | 'otra';

export const TEXTO_FALLA_VOZ: Record<FallaVoz, string> = {
  permiso: 'Sin permiso de micrófono puedes escribir tu pregunta. Actívalo en los ajustes del teléfono.',
  noDisponible: 'Este teléfono no tiene reconocimiento de voz. Escribe tu pregunta.',
  sinVoz: 'No te escuché. Toca el micrófono e inténtalo de nuevo.',
  idioma: 'El reconocimiento de voz en español no está instalado en este teléfono. Escribe tu pregunta.',
  conexion: 'El reconocimiento de voz necesita conexión. Escribe tu pregunta.',
  sinLectura: 'Este teléfono no tiene una voz en español para leer la respuesta. Puedes leerla en pantalla.',
  otra: 'No se pudo usar el micrófono. Inténtalo de nuevo o escribe tu pregunta.',
};

export interface VozTelefono {
  identifier: string;
  language: string;
}

const ESPANOL_PREFERIDO = ['es-mx', 'es-us', 'es-419'];

// Prefiere español de México o de América y, entre iguales, una voz que no necesite conexión.
export function elegirVoz<T extends VozTelefono>(voces: readonly T[]): T | undefined {
  const puntos = ({ identifier, language }: T) => {
    const lugar = ESPANOL_PREFERIDO.indexOf(language.toLowerCase());
    return (lugar < 0 ? ESPANOL_PREFERIDO.length : lugar) * 2 + (identifier.includes('network') ? 1 : 0);
  };
  return voces
    .filter((v) => /^es(-|$)/i.test(v.language))
    .sort((a, b) => puntos(a) - puntos(b) || a.identifier.localeCompare(b.identifier))[0];
}

// "15:00" se lee mal en voz alta: se dice como lo diría una persona.
function horaHablada(horas: number, minutos: number): string {
  const numero = horas % 12 || 12;
  const momento = horas < 12 ? 'de la mañana' : horas === 12 ? 'del día' : horas < 19 ? 'de la tarde' : 'de la noche';
  return `${numero}${minutos ? ` y ${minutos}` : ''} ${momento}`;
}

export function textoParaVoz(texto: string): string {
  return texto
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_, h: string, m: string) => horaHablada(Number(h), Number(m)))
    .replace(/\bFrac\./g, 'Fraccionamiento')
    .replace(/\bAv\./g, 'Avenida')
    .replace(/\bPriv\./g, 'Privada')
    .replace(/\b([MV])(\d)\b/g, '$1 $2')
    .replace(/\s*\(/g, ', ')
    .replace(/\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MensajeAsistente {
  de: 'persona' | 'asistente';
  texto: string;
}

const GENERICAS = new Set(['fraccionamiento', 'colonia', 'privada', 'privadas', 'zona']);
const esNumero = (p: string) => /^\d+$/.test(p);

// Formas en que alguien nombra un lugar: completo, sin "Frac." y sin el número de sección.
function variantes(nombre: string): string[][] {
  const completa = palabras(nombre.replace(/\(.*?\)/g, ' '));
  const formas = [completa];
  if (completa.length > 1 && GENERICAS.has(completa[0]!)) formas.push(completa.slice(1));
  for (const forma of [...formas]) {
    const base = forma.slice(0, -1);
    const esVia = base.includes('avenida') || base.includes('calle');
    if (esNumero(forma.at(-1)!) && base.length > 0 && !esVia && !base.some(esNumero)) formas.push(base);
  }
  return formas.filter((f) => !(f.length === 1 && GENERICAS.has(f[0]!))).map((f) => f.map(sinFaltas));
}

// Lugares que la pregunta nombra completos. Entre nombres encimados gana el más largo:
// "Ampliación San Nicolás" no es "San Nicolás". Si sigue habiendo varios, se devuelven todos.
export function lugaresEnTexto(texto: string, lugares: readonly Lugar[] = LUGARES): Lugar[] {
  const originales = palabras(texto);
  const dichas = originales.map(sinFaltas);
  const hallados: { lugar: Lugar; inicio: number; fin: number }[] = [];

  for (const lugar of lugares) {
    for (const forma of variantes(lugar.nombre)) {
      for (let inicio = 0; inicio + forma.length <= dichas.length; inicio++) {
        if (!forma.every((p, i) => dichas[inicio + i] === p)) continue;
        // "25" y "56" son lugares, pero también números: hace falta "la 25" o "colonia 25".
        const previa = originales[inicio - 1] ?? '';
        if (forma.length === 1 && esNumero(forma[0]!) && previa !== 'la' && previa !== 'colonia') continue;
        hallados.push({ lugar, inicio, fin: inicio + forma.length });
      }
    }
  }

  const visibles = hallados.filter(
    (a) => !hallados.some((b) => b.inicio <= a.inicio && b.fin >= a.fin && b.fin - b.inicio > a.fin - a.inicio),
  );
  return [...new Set(visibles.map((h) => h.lugar))];
}

const PIDE_HORARIO =
  /\b(cuando|que dias?|que hora|hoy|manana|pasan?|pasara|tocan?|horarios?|recolec\w*|recog\w*|camion|turno|ventana|ruta)\b/;
// Quejas, reportes y dudas de otro tipo no se contestan con un horario.
const OTRA_COSA =
  /\b(no paso|no han? pasado|no pasaron|report\w*|queja\w*|que hago|como|por que|porque|donde|quien|cuanto|avisos?|mapa|multa\w*)\b/;
const MI_LUGAR = /\bmi (colonia|casa|calle|fraccionamiento|zona|rumbo|lugar)\b/;

function parrafo(lugar: Lugar, ahora: Date): string {
  const horarios = lugar.horarios.map((h) => {
    const duda = h.porConfirmar ? ` ${AVISO_POR_CONFIRMAR}` : '';
    return `${textoHorario(h.dias, h.turno)} (${etiquetaRuta(h).toLowerCase().replace(' · ', ', ')}).${duda}`;
  });
  const hoy = estadoDeHoy(lugar.horarios, ahora);
  return [`${lugar.nombre}: ${horarios.join(' También ')}`, hoy ? `${hoy.mensaje}.` : ''].filter(Boolean).join(' ');
}

export interface RespuestaLocal {
  texto: string;
  // Un solo lugar: la pantalla puede ofrecer su horario completo.
  lugarId?: string;
}

// Null cuando la pregunta no es de horario o no se reconoce el lugar: entonces contesta la IA.
export function responderHorario(
  pregunta: string,
  ahora: Date,
  guardado?: Lugar,
  lugares: readonly Lugar[] = LUGARES,
): RespuestaLocal | null {
  const dichas = palabras(pregunta);
  const normal = dichas.join(' ');
  if (OTRA_COSA.test(normal)) return null;

  const nombrados = lugaresEnTexto(pregunta, lugares);
  const esSoloUnLugar = nombrados.length > 0 && dichas.length <= 6;
  if (!PIDE_HORARIO.test(normal) && !esSoloUnLugar) return null;

  if (nombrados.length > 3) {
    const lista = nombrados.map((l) => l.nombre).join(', ');
    return { texto: `Hay varios lugares con ese nombre: ${lista}. ¿Cuál es el tuyo?` };
  }
  if (nombrados.length > 0) {
    const texto = [...nombrados.map((l) => parrafo(l, ahora)), AVISO_FUENTE_HOY].join('\n');
    const [unico] = nombrados;
    return nombrados.length === 1 && unico ? { texto, lugarId: unico.id } : { texto };
  }
  if (MI_LUGAR.test(normal)) {
    return guardado
      ? { texto: [parrafo(guardado, ahora), AVISO_FUENTE_HOY].join('\n'), lugarId: guardado.id }
      : { texto: 'Aún no guardas tu colonia. Dime cuál es, o búscala en Inicio y guárdala.' };
  }
  return null;
}
