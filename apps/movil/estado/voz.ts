import { elegirVoz, LUGARES, textoParaVoz, type FallaVoz } from '@carmen-limpio/compartido';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule as Reconocedor,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState } from 'react-native';

// La voz la resuelve el teléfono: la app nunca recibe ni guarda el audio, solo el texto reconocido.

// Si el español de México no está disponible se prueba con los demás.
const IDIOMAS = ['es-MX', 'es-US', 'es-ES'] as const;

// Hay reconocedores que no se detienen solos con el silencio: el micrófono no se queda abierto.
const ESCUCHA_MAXIMA_MS = 20_000;

const INTERVALO_VOLUMEN_MS = 100;
// El reconocedor da de -2 a 10, y de 0 para abajo no se oye.
const VOLUMEN_MAXIMO = 10;

const FALLA: Partial<Record<ExpoSpeechRecognitionErrorCode, FallaVoz>> = {
  'language-not-supported': 'idioma',
  'no-speech': 'sinVoz',
  'not-allowed': 'permiso',
  'service-not-allowed': 'noDisponible',
  'speech-timeout': 'sinVoz',
  network: 'conexion',
};

function iniciar(idioma: string) {
  Reconocedor.start({
    continuous: false,
    // Ayuda a reconocer nombres como "Bivalvo" o "Nacozari".
    contextualStrings: LUGARES.map((l) => l.nombre),
    interimResults: true,
    lang: idioma,
    maxAlternatives: 1,
    volumeChangeEventOptions: { enabled: true, intervalMillis: INTERVALO_VOLUMEN_MS },
  });
}

interface Opciones {
  alEntender: (texto: string) => void;
  alFallar: (falla: FallaVoz) => void;
}

export function useVoz({ alEntender, alFallar }: Opciones) {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [hablando, setHablando] = useState(false);
  // De 0 a 1. Es un valor animado para no volver a dibujar el chat diez veces por segundo.
  const volumen = useRef(new Animated.Value(0)).current;
  // Solo hay un intento a la vez: su resultado se entrega al terminar el reconocimiento.
  const activo = useRef(false);
  const enPantalla = useRef(false);
  // El diálogo del permiso pone la app en segundo plano: no es que la persona haya salido.
  const pidiendoPermiso = useRef(false);
  const idioma = useRef(0);
  const reintentar = useRef(false);
  const dicho = useRef('');
  const parcialActual = useRef('');
  const falla = useRef<FallaVoz | undefined>(undefined);
  // Identifica la lectura en curso: el final de una anterior no apaga la nueva.
  const lectura = useRef(0);

  const callar = useCallback(() => {
    lectura.current += 1;
    setHablando(false);
    Speech.stop().catch(() => {});
  }, []);

  const cancelar = useCallback(() => {
    callar();
    if (!activo.current) return;
    activo.current = false;
    setEscuchando(false);
    setParcial('');
    Reconocedor.abort();
  }, [callar]);

  // Nada sigue escuchando ni leyendo al salir de la pantalla o de la app.
  useFocusEffect(
    useCallback(() => {
      enPantalla.current = true;
      return () => {
        enPantalla.current = false;
        cancelar();
      };
    }, [cancelar]),
  );
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'background' && !pidiendoPermiso.current) cancelar();
    });
    return () => suscripcion.remove();
  }, [cancelar]);

  useEffect(() => {
    if (!escuchando) return;
    volumen.setValue(0);
    const reloj = setTimeout(() => Reconocedor.stop(), ESCUCHA_MAXIMA_MS);
    return () => clearTimeout(reloj);
  }, [escuchando, volumen]);

  useSpeechRecognitionEvent('volumechange', ({ value }) => {
    if (!activo.current) return;
    Animated.timing(volumen, {
      duration: INTERVALO_VOLUMEN_MS,
      toValue: Math.min(1, Math.max(0, value / VOLUMEN_MAXIMO)),
      useNativeDriver: true,
    }).start();
  });

  useSpeechRecognitionEvent('result', ({ results, isFinal }) => {
    if (!activo.current) return;
    const texto = results[0]?.transcript ?? '';
    setParcial(texto);
    if (isFinal) dicho.current = texto;
    else parcialActual.current = texto;
  });

  useSpeechRecognitionEvent('error', ({ error }) => {
    if (!activo.current) return;
    if (error === 'language-not-supported' && idioma.current < IDIOMAS.length - 1) {
      idioma.current += 1;
      reintentar.current = true;
      return;
    }
    falla.current = FALLA[error] ?? 'otra';
  });

  // Siempre es el último evento, también después de un error.
  useSpeechRecognitionEvent('end', () => {
    if (!activo.current) return;
    if (reintentar.current) {
      reintentar.current = false;
      iniciar(IDIOMAS[idioma.current]!);
      return;
    }
    activo.current = false;
    setEscuchando(false);
    setParcial('');
    // Sin resultado final ni error, vale lo último que se entendió.
    const texto = (dicho.current || (falla.current ? '' : parcialActual.current)).trim();
    if (texto) alEntender(texto);
    else alFallar(falla.current ?? 'sinVoz');
  });

  // El permiso se pide aquí, al tocar el micrófono, y no antes.
  const escuchar = async () => {
    if (activo.current) return;
    callar();
    activo.current = true;
    dicho.current = '';
    parcialActual.current = '';
    falla.current = undefined;
    reintentar.current = false;
    try {
      if (!Reconocedor.isRecognitionAvailable()) throw 'noDisponible';
      pidiendoPermiso.current = true;
      const { granted } = await Reconocedor.requestPermissionsAsync();
      if (!granted) throw 'permiso';
      // Pudo salir de la pantalla mientras respondía al permiso.
      if (!activo.current) return;
      setEscuchando(true);
      iniciar(IDIOMAS[idioma.current]!);
    } catch (e) {
      activo.current = false;
      setEscuchando(false);
      alFallar(e === 'noDisponible' || e === 'permiso' ? e : 'otra');
    } finally {
      pidiendoPermiso.current = false;
    }
  };

  const hablar = async (texto: string) => {
    callar();
    const actual = lectura.current;
    // Con TalkBack la respuesta ya se lee en pantalla: dos voces a la vez no se entienden.
    const [conLector, voces] = await Promise.all([
      AccessibilityInfo.isScreenReaderEnabled().catch(() => false),
      Speech.getAvailableVoicesAsync().catch(() => []),
    ]);
    // Una respuesta que llega tarde no se lee si ya salió de la pantalla.
    if (conLector || actual !== lectura.current || !enPantalla.current || AppState.currentState !== 'active') return;
    // Sin voz en español, Android leería con el acento del idioma del teléfono.
    const voz = elegirVoz(voces);
    if (!voz) {
      alFallar('sinLectura');
      return;
    }
    const fin = () => {
      if (actual === lectura.current) setHablando(false);
    };
    setHablando(true);
    Speech.speak(textoParaVoz(texto).slice(0, Speech.maxSpeechInputLength), {
      // expo-speech en Android solo acepta el idioma: con "es-MX" usa el del teléfono sin avisar.
      language: 'es',
      onDone: fin,
      onError: fin,
      onStopped: fin,
      voice: voz.identifier,
    });
  };

  return { callar, escuchando, escuchar, hablando, hablar, parcial, terminar: () => Reconocedor.stop(), volumen };
}
