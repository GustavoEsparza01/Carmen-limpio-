import { COLORES, LARGO_MINIMO_CLAVE, validarCuenta } from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorCampo } from '../../componentes/formularioReporte';
import { Aviso, BarraEstado, Boton } from '../../componentes/ui';
import { textoError, useCuenta } from '../../estado/cuenta';
import { ALTURA_TACTIL, CONTENIDO, RADIO, TEXTO } from '../../estilos/tema';

// Registro (después de aceptar el aviso de privacidad) o inicio de sesión, con correo y contraseña.
export default function Cuenta() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const registro = modo === 'registro';
  const { registrar, entrar } = useCuenta();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [revisar, setRevisar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmar, setConfirmar] = useState(false);

  const errores = validarCuenta(correo, clave);
  const mostrados = revisar ? errores : {};

  const enviar = async () => {
    setRevisar(true);
    if (Object.keys(errores).length > 0 || enviando) return;
    setEnviando(true);
    setError(undefined);
    try {
      if (registro) {
        const { confirmarCorreo } = await registrar(correo, clave);
        if (confirmarCorreo) {
          setConfirmar(true);
          setEnviando(false);
          return;
        }
      } else {
        await entrar(correo, clave);
      }
      router.back();
    } catch (e) {
      setError(textoError(e));
      setEnviando(false);
    }
  };

  if (confirmar) {
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <BarraEstado estilo="dark" />
        <Stack.Screen options={{ title: 'Revisa tu correo' }} />
        <Text style={TEXTO.cuerpo}>
          Te enviamos un enlace a {correo.trim()}. Ábrelo para confirmar tu cuenta y luego inicia sesión aquí.
        </Text>
        <Boton icono="log-in" onPress={() => router.replace('/reportes/cuenta?modo=entrar')} texto="Ir a iniciar sesión" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <BarraEstado estilo="dark" />
      <Stack.Screen options={{ title: registro ? 'Crear cuenta' : 'Iniciar sesión' }} />
      {registro && <Aviso>Solo usamos tu correo para tu cuenta. No pedimos tu nombre ni tu teléfono.</Aviso>}

      <View style={estilos.campo}>
        <Text style={TEXTO.fila}>Correo</Text>
        <TextInput
          accessibilityLabel="Correo"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          inputMode="email"
          onChangeText={setCorreo}
          placeholder="tucorreo@ejemplo.com"
          placeholderTextColor={COLORES.textoSuave}
          style={estilos.entrada}
          textContentType="emailAddress"
          value={correo}
        />
        <ErrorCampo texto={mostrados.correo} />
      </View>

      <View style={estilos.campo}>
        <Text style={TEXTO.fila}>Contraseña</Text>
        <View style={estilos.fila}>
          <TextInput
            accessibilityLabel="Contraseña"
            autoCapitalize="none"
            autoComplete={registro ? 'new-password' : 'current-password'}
            autoCorrect={false}
            onChangeText={setClave}
            onSubmitEditing={enviar}
            placeholderTextColor={COLORES.textoSuave}
            secureTextEntry={!verClave}
            style={[estilos.entrada, estilos.clave]}
            value={clave}
          />
          <Pressable
            accessibilityLabel={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            onPress={() => setVerClave((v) => !v)}
            style={estilos.ojo}
          >
            <Ionicons color={COLORES.primario} name={verClave ? 'eye-off' : 'eye'} size={22} />
          </Pressable>
        </View>
        {registro && <Text style={TEXTO.apoyo}>Al menos {LARGO_MINIMO_CLAVE} caracteres.</Text>}
        <ErrorCampo texto={mostrados.clave} />
      </View>

      <ErrorCampo texto={error} />
      <Boton
        icono={registro ? 'person-add' : 'log-in'}
        onPress={enviar}
        texto={enviando ? 'Un momento…' : registro ? 'Crear cuenta' : 'Iniciar sesión'}
      />

      <Pressable
        accessibilityRole="button"
        // Para crear una cuenta primero se acepta el aviso de privacidad.
        onPress={() => router.replace(registro ? '/reportes/cuenta?modo=entrar' : '/reportes/privacidad')}
        style={estilos.enlace}
      >
        <Text style={TEXTO.enlace}>{registro ? 'Ya tengo cuenta' : 'No tengo cuenta: crear una'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  campo: { gap: 8 },
  fila: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  entrada: {
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: 1,
    ...TEXTO.campo,
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: 14,
  },
  clave: { flex: 1 },
  ojo: { alignItems: 'center', height: ALTURA_TACTIL, justifyContent: 'center', width: ALTURA_TACTIL },
  enlace: { alignSelf: 'center', justifyContent: 'center', minHeight: ALTURA_TACTIL },
});
