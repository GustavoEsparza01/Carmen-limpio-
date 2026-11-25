import {
  AVISO_ASISTENTE,
  AVISO_ASISTENTE_CORTO,
  COLORES,
  LARGO_MAXIMO_PREGUNTA,
  lugarPorId,
  responderHorario,
  TEXTO_FALLA_ASISTENTE,
  TEXTO_FALLA_VOZ,
  type FallaVoz,
  type MensajeAsistente,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso, BarraEstado, Boton, Pastilla } from '../componentes/ui';
import { aceptarAviso, avisoAceptado, ErrorAsistente, preguntarIA } from '../estado/asistente';
import { useGuardados } from '../estado/guardados';
import { useVoz } from '../estado/voz';
import { ALTURA_TACTIL, CONTENIDO, FUENTE, RADIO, TEXTO } from '../estilos/tema';

interface Mensaje extends MensajeAsistente {
  id: number;
  // De dónde salió la respuesta: la persona debe saber cuándo habla la IA.
  origen?: 'datos' | 'ia' | 'falla';
  lugarId?: string;
}

const SUGERENCIAS = ['¿Cuándo pasa por mi colonia?', '¿Cómo activo un recordatorio?', '¿Hay avisos?'];

const ORIGEN = {
  datos: { icono: 'document-text-outline', texto: 'Datos de la app' },
  ia: { icono: 'sparkles-outline', texto: 'Respuesta con IA' },
  falla: { icono: 'alert-circle-outline', texto: 'Sin respuesta' },
} as const;

function Presentacion({ onAceptar }: { onAceptar: () => void }) {
  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        Antes de preguntar
      </Text>
      {AVISO_ASISTENTE.map((texto) => (
        <View key={texto} style={estilos.punto}>
          <Ionicons color={COLORES.primario} name="ellipse" size={8} style={estilos.vineta} />
          <Text style={estilos.puntoTexto}>{texto}</Text>
        </View>
      ))}
      <Boton icono="checkmark" onPress={onAceptar} texto="Soy mayor de 18 y acepto" />
      <Boton icono="document-text" onPress={() => router.push('/reportes/privacidad?leer=1')} texto="Aviso de privacidad" variante="secundario" />
      <Boton icono="close" onPress={() => router.back()} texto="Ahora no" variante="secundario" />
    </ScrollView>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const propia = mensaje.de === 'persona';
  const origen = mensaje.origen && ORIGEN[mensaje.origen];
  const { lugarId } = mensaje;
  return (
    <View style={[estilos.burbuja, propia ? estilos.burbujaPropia : estilos.burbujaAjena]}>
      <Text selectable style={[estilos.burbujaTexto, propia && estilos.burbujaTextoPropio]}>
        {mensaje.texto}
      </Text>
      {origen && (
        <View style={estilos.origen}>
          <Ionicons color={COLORES.textoSuave} name={origen.icono} size={14} />
          <Text style={TEXTO.pequeno}>{origen.texto}</Text>
        </View>
      )}
      {lugarId && (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/lugar/${lugarId}`)} style={estilos.enlace}>
          <Text style={TEXTO.enlace}>Ver horario completo</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Asistente() {
  const { bottom } = useSafeAreaInsets();
  const altoEncabezado = useHeaderHeight();
  const { guardados } = useGuardados();
  const [aceptado, setAceptado] = useState<boolean>();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [esperando, setEsperando] = useState(false);
  const [fallaVoz, setFallaVoz] = useState<FallaVoz>();
  const lista = useRef<ComponentRef<typeof ScrollView>>(null);
  const siguienteId = useRef(0);

  useEffect(() => {
    avisoAceptado().then(setAceptado, () => setAceptado(false));
  }, []);

  const agregar = (nuevo: Omit<Mensaje, 'id'>) =>
    setMensajes((previos) => [...previos, { ...nuevo, id: siguienteId.current++ }]);

  // Lo que se pregunta hablando se contesta hablando, y también por escrito.
  const preguntar = async (entrada: string, porVoz = false) => {
    const pregunta = entrada.trim().slice(0, LARGO_MAXIMO_PREGUNTA);
    if (!pregunta || esperando) return;
    callar();
    setFallaVoz(undefined);
    const responder = (respuesta: Omit<Mensaje, 'id' | 'de'>) => {
      agregar({ ...respuesta, de: 'asistente' });
      if (porVoz) hablar(respuesta.texto);
    };
    // Los avisos de falla no son parte de la conversación con la IA.
    const anteriores = mensajes.filter((m) => m.origen !== 'falla');
    setTexto('');
    agregar({ de: 'persona', texto: pregunta });

    const primero = guardados[0];
    const local = responderHorario(pregunta, new Date(), primero && lugarPorId(primero.lugarId));
    if (local) {
      responder({ origen: 'datos', ...local });
      return;
    }
    setEsperando(true);
    try {
      responder({ origen: 'ia', texto: await preguntarIA(pregunta, anteriores) });
    } catch (e) {
      const falla = e instanceof ErrorAsistente ? e.falla : 'ocupado';
      responder({ origen: 'falla', texto: TEXTO_FALLA_ASISTENTE[falla] });
    } finally {
      setEsperando(false);
    }
  };

  const { escuchando, parcial, hablando, escuchar, terminar, hablar, callar } = useVoz({
    alEntender: (dicho) => preguntar(dicho, true),
    alFallar: setFallaVoz,
  });

  const tocarMicrofono = () => {
    setFallaVoz(undefined);
    if (hablando) callar();
    else if (escuchando) terminar();
    else escuchar();
  };

  const aceptar = () => {
    setAceptado(true);
    aceptarAviso().catch(() => {});
  };

  if (aceptado === undefined) return null;
  if (!aceptado) return <Presentacion onAceptar={aceptar} />;

  const puedeEnviar = texto.trim().length > 0 && !esperando && !escuchando;
  const etiquetaMicrofono = hablando ? 'Dejar de leer' : escuchando ? 'Terminar de hablar' : 'Preguntar por voz';

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={altoEncabezado} style={estilos.pantalla}>
      <BarraEstado estilo="dark" />
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => lista.current?.scrollToEnd()}
        ref={lista}
        style={estilos.lista}
      >
        <Aviso>{AVISO_ASISTENTE_CORTO}</Aviso>
        {mensajes.length === 0 && (
          <View style={estilos.sugerencias}>
            <Text style={TEXTO.cuerpo}>Pregunta cuándo pasa por una colonia o cómo usar la app.</Text>
            {SUGERENCIAS.map((s) => (
              <Pastilla activa={false} key={s} onPress={() => preguntar(s)} texto={s} />
            ))}
          </View>
        )}
        <View accessibilityLiveRegion="polite" style={estilos.mensajes}>
          {mensajes.map((m) => (
            <Burbuja key={m.id} mensaje={m} />
          ))}
          {esperando && (
            <View accessibilityLabel="Pensando" accessible style={[estilos.burbuja, estilos.burbujaAjena]}>
              <ActivityIndicator color={COLORES.primario} />
            </View>
          )}
        </View>
      </ScrollView>

      {fallaVoz && (
        <Text accessibilityLiveRegion="polite" style={estilos.fallaVoz}>
          {TEXTO_FALLA_VOZ[fallaVoz]}
        </Text>
      )}
      <View style={[estilos.entrada, { paddingBottom: 10 + bottom }]}>
        <TextInput
          accessibilityLabel="Tu pregunta"
          editable={!escuchando}
          maxLength={LARGO_MAXIMO_PREGUNTA}
          multiline
          onChangeText={setTexto}
          placeholder={escuchando ? 'Te escucho…' : 'Escribe o habla'}
          placeholderTextColor={COLORES.textoSuave}
          style={estilos.campo}
          value={escuchando ? parcial : texto}
        />
        <Pressable
          accessibilityLabel={etiquetaMicrofono}
          accessibilityRole="button"
          accessibilityState={{ disabled: esperando }}
          disabled={esperando}
          onPress={tocarMicrofono}
          style={[estilos.microfono, (escuchando || hablando) && estilos.microfonoActivo]}
        >
          <Ionicons
            color={escuchando || hablando ? COLORES.superficie : esperando ? COLORES.inactivoTexto : COLORES.primario}
            name={escuchando || hablando ? 'stop' : 'mic'}
            size={22}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Enviar"
          accessibilityRole="button"
          accessibilityState={{ disabled: !puedeEnviar }}
          disabled={!puedeEnviar}
          onPress={() => preguntar(texto)}
          style={[estilos.enviar, !puedeEnviar && estilos.enviarInactivo]}
        >
          <Ionicons color={puedeEnviar ? COLORES.superficie : COLORES.inactivoTexto} name="send" size={20} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  lista: { flex: 1 },
  contenido: CONTENIDO,
  punto: { flexDirection: 'row', gap: 10 },
  vineta: { marginTop: 8 },
  puntoTexto: { ...TEXTO.cuerpo, flex: 1 },
  sugerencias: { alignItems: 'flex-start', gap: 10 },
  mensajes: { gap: 10 },
  burbuja: { borderRadius: RADIO.grande, gap: 8, maxWidth: '88%', padding: 14 },
  burbujaPropia: { alignSelf: 'flex-end', backgroundColor: COLORES.primario },
  burbujaAjena: {
    alignSelf: 'flex-start',
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderWidth: StyleSheet.hairlineWidth,
  },
  burbujaTexto: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 16, fontWeight: '500', lineHeight: 23 },
  burbujaTextoPropio: { color: COLORES.superficie },
  origen: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  enlace: { justifyContent: 'center', minHeight: ALTURA_TACTIL },
  entrada: {
    alignItems: 'flex-end',
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  campo: {
    ...TEXTO.campo,
    backgroundColor: COLORES.fondo,
    borderColor: COLORES.borde,
    borderRadius: RADIO.grande,
    borderWidth: 1,
    flex: 1,
    maxHeight: 130,
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  enviar: {
    alignItems: 'center',
    backgroundColor: COLORES.primario,
    borderRadius: RADIO.completo,
    height: ALTURA_TACTIL,
    justifyContent: 'center',
    width: ALTURA_TACTIL,
  },
  enviarInactivo: { backgroundColor: COLORES.inactivo },
  microfono: {
    alignItems: 'center',
    backgroundColor: COLORES.primarioSuave,
    borderRadius: RADIO.completo,
    height: ALTURA_TACTIL,
    justifyContent: 'center',
    width: ALTURA_TACTIL,
  },
  microfonoActivo: { backgroundColor: COLORES.errorTexto },
  fallaVoz: { ...TEXTO.alerta, backgroundColor: COLORES.superficie, paddingHorizontal: 16, paddingTop: 10 },
});
