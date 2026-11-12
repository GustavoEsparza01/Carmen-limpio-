import { AVISO_PRIVACIDAD, AVISO_PRIVACIDAD_BORRADOR } from '@carmen-limpio/compartido';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorCampo } from '../../componentes/formularioReporte';
import { Aviso, BarraEstado, Boton } from '../../componentes/ui';
import { textoError, useCuenta } from '../../estado/cuenta';
import { CONTENIDO, TEXTO } from '../../estilos/tema';

// Se muestra antes de pedir cualquier dato (LFPDPPP): al crear la cuenta, o si el aviso cambió.
export default function Privacidad() {
  const { usuario, aceptarPrivacidad } = useCuenta();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>();

  const aceptar = async () => {
    if (!usuario) {
      router.replace('/reportes/cuenta?modo=registro');
      return;
    }
    if (enviando) return;
    setEnviando(true);
    setError(undefined);
    try {
      await aceptarPrivacidad();
      router.back();
    } catch (e) {
      setError(textoError(e));
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Aviso icono="document-text">{AVISO_PRIVACIDAD_BORRADOR}</Aviso>
      {AVISO_PRIVACIDAD.map(({ titulo, texto }) => (
        <View key={titulo} style={estilos.seccion}>
          <Text accessibilityRole="header" style={TEXTO.fila}>
            {titulo}
          </Text>
          <Text style={TEXTO.cuerpo}>{texto}</Text>
        </View>
      ))}
      <ErrorCampo texto={error} />
      <Boton
        icono="checkmark"
        onPress={aceptar}
        texto={enviando ? 'Guardando…' : usuario ? 'Acepto' : 'Acepto y creo mi cuenta'}
      />
      <Boton icono="close" onPress={() => router.back()} texto="Ahora no" variante="secundario" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  seccion: { gap: 4 },
});
