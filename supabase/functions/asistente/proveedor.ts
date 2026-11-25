// El proveedor de IA es intercambiable: cambiarlo no toca la app ni el resto de la función.

export interface Mensaje {
  de: 'persona' | 'asistente';
  texto: string;
}

export interface Peticion {
  instrucciones: string;
  mensajes: Mensaje[];
}

export type Proveedor = (peticion: Peticion) => Promise<string>;

// Incluye la cuota agotada del proveedor: para quien pregunta es lo mismo.
export class ProveedorNoDisponible extends Error {}

const LIMITE_MS = 15_000;

interface RespuestaGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export const RESPUESTA_BLOQUEADA = 'No puedo ayudar con eso. Pregúntame sobre la recolección o el uso de la app.';

// generateContent y no Interactions: cada petición va completa y Google no guarda la conversación como sesión.
export function gemini(clave: string, modelo: string, pedir: typeof fetch = fetch): Proveedor {
  return async ({ instrucciones, mensajes }) => {
    let respuesta: Response;
    try {
      respuesta = await pedir(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        // La clave va en un encabezado para que no quede en la dirección ni en registros.
        headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucciones }] },
          contents: mensajes.map((m) => ({ role: m.de === 'persona' ? 'user' : 'model', parts: [{ text: m.texto }] })),
          generationConfig: { maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(LIMITE_MS),
      });
    } catch (e) {
      throw new ProveedorNoDisponible(`Sin respuesta de Gemini: ${e instanceof Error ? e.name : 'error'}`);
    }
    if (!respuesta.ok) throw new ProveedorNoDisponible(`Gemini respondió ${respuesta.status}`);

    const datos = (await respuesta.json()) as RespuestaGemini;
    if (datos.promptFeedback?.blockReason) return RESPUESTA_BLOQUEADA;
    const [candidato] = datos.candidates ?? [];
    const texto = (candidato?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (candidato?.finishReason === 'STOP' && texto) return texto;
    if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'].includes(candidato?.finishReason ?? '')) {
      return RESPUESTA_BLOQUEADA;
    }
    // Una respuesta cortada puede quedar a medias y decir lo contrario: no se muestra.
    throw new ProveedorNoDisponible(`Gemini terminó con ${candidato?.finishReason ?? 'respuesta vacía'}`);
  };
}
