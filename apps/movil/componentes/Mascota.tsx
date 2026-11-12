import { Image, StyleSheet, View } from 'react-native';

// Único punto de uso del camarón: sus derechos siguen sin confirmar (ver docs/decisiones.md).
// El dibujo mide 520 píxeles dentro de un lienzo de 1024.
const IMAGEN = require('../assets/android-icon-foreground.png');
const ESCALA_LIENZO = 1024 / 520;

export function Mascota({ tamano }: { tamano: number }) {
  const lienzo = tamano * ESCALA_LIENZO;
  const margen = (tamano - lienzo) / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[estilos.marco, { height: tamano, width: tamano }]}>
      <Image resizeMode="contain" source={IMAGEN} style={{ height: lienzo, left: margen, top: margen, width: lienzo }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { overflow: 'hidden' },
});
