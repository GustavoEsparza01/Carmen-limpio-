import { COLORES } from '@carmen-limpio/compartido';
import { Animated, StyleSheet, View } from 'react-native';
import { RADIO } from '../estilos/tema';

// Las barras del centro se mueven más, como el dibujo de una voz.
const PESOS = [0.45, 0.75, 1, 0.75, 0.45] as const;
const REPOSO = 0.18;

// Sigue el volumen real del micrófono: si no se mueve, no está entrando sonido. Por eso se mueve
// también con "quitar animaciones": es información, no adorno.
export function OndaVoz({ volumen }: { volumen: Animated.Value }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={estilos.onda}>
      {PESOS.map((peso, i) => {
        const scaleY = volumen.interpolate({ inputRange: [0, 1], outputRange: [REPOSO, REPOSO + (1 - REPOSO) * peso] });
        return <Animated.View key={i} style={[estilos.barra, { transform: [{ scaleY }] }]} />;
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  onda: { alignItems: 'center', flexDirection: 'row', gap: 5, height: 40 },
  barra: { backgroundColor: COLORES.superficie, borderRadius: RADIO.chico, height: 40, width: 6 },
});
