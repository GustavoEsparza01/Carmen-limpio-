import { AVISO_PRIVACIDAD_BORRADOR, BORRADOR_PRIVACIDAD } from '@carmen-limpio/compartido';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton } from '../../componentes/ui';
import { useDemo } from '../../estado/demo';
import { CONTENIDO, TEXTO } from '../../estilos/tema';

export default function Privacidad() {
  const { entrar } = useDemo();

  const aceptar = async () => {
    await entrar();
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Aviso icono="document-text">{AVISO_PRIVACIDAD_BORRADOR}</Aviso>
      {BORRADOR_PRIVACIDAD.map(({ titulo, texto }) => (
        <View key={titulo} style={estilos.seccion}>
          <Text accessibilityRole="header" style={TEXTO.fila}>
            {titulo}
          </Text>
          <Text style={TEXTO.cuerpo}>{texto}</Text>
        </View>
      ))}
      <Boton icono="checkmark" onPress={aceptar} texto="Acepto y entro a la demostración" />
      <Boton icono="close" onPress={() => router.back()} texto="Ahora no" variante="secundario" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  seccion: { gap: 4 },
});
