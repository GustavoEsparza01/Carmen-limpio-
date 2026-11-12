import { COLORES, validarCorreo } from '@carmen-limpio/compartido';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorCampo } from '../../componentes/formularioReporte';
import { BarraEstado, Boton } from '../../componentes/ui';
import { textoError, useCuenta } from '../../estado/cuenta';
import { ALTURA_TACTIL, CONTENIDO, RADIO, TEXTO } from '../../estilos/tema';

// Pide el enlace para cambiar la contraseña. La nueva se escribe en el sitio (NUEVA_CLAVE), no en la app.
export default function Recuperar() {
  const { correo: inicial } = useLocalSearchParams<{ correo?: string }>();
  const { recuperarClave } = useCuenta();
  const [correo, setCorreo] = useState(inicial ?? '');
  const [revisar, setRevisar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>();
  const [enviado, setEnviado] = useState(false);

  const errorCorreo = validarCorreo(correo);

  const enviar = async () => {
    setRevisar(true);
    if (errorCorreo || enviando) return;
    setEnviando(true);
    setError(undefined);
    try {
      await recuperarClave(correo);
      setEnviado(true);
    } catch (e) {
      setError(textoError(e));
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <BarraEstado estilo="dark" />
        <Text style={TEXTO.cuerpo}>
          Si hay una cuenta con {correo.trim()}, te enviamos un enlace. Ábrelo, escribe tu nueva contraseña y luego
          inicia sesión aquí.
        </Text>
        <Text style={TEXTO.apoyo}>Si no llega en unos minutos, revisa la carpeta de spam.</Text>
        <Boton icono="log-in" onPress={() => router.back()} texto="Volver a iniciar sesión" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <BarraEstado estilo="dark" />
      <Text style={TEXTO.cuerpo}>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</Text>

      <View style={estilos.campo}>
        <Text style={TEXTO.fila}>Correo</Text>
        <TextInput
          accessibilityLabel="Correo"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          inputMode="email"
          onChangeText={setCorreo}
          onSubmitEditing={enviar}
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor={COLORES.textoSuave}
          style={estilos.entrada}
          textContentType="emailAddress"
          value={correo}
        />
        <ErrorCampo texto={revisar ? errorCorreo : undefined} />
      </View>

      <ErrorCampo texto={error} />
      <Boton icono="mail" onPress={enviar} texto={enviando ? 'Un momento…' : 'Enviar enlace'} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  campo: { gap: 8 },
  entrada: {
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: 1,
    ...TEXTO.campo,
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: 14,
  },
});
