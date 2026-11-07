import { COLORES } from '@carmen-limpio/compartido';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useReducirAnimacion } from '../estado/animacion';
import { RADIO } from '../estilos/tema';

const DURACION_ENTRADA_MS = 220;
const DURACION_PULSO_MS = 700;
const PASO_CAMION_MS = 160;
const REBOTES_CAMION = 4;

// Entrada suave. Para repetirla al cambiar de contenido, dale una `key` nueva.
export function Aparecer({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const reducir = useReducirAnimacion();
  const avance = useRef(new Animated.Value(reducir ? 1 : 0)).current;

  useEffect(() => {
    if (reducir) {
      avance.setValue(1);
      return;
    }
    Animated.timing(avance, {
      duration: DURACION_ENTRADA_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [avance, reducir]);

  const desplazamiento = avance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={[style, { opacity: avance, transform: [{ translateY: desplazamiento }] }]}>
      {children}
    </Animated.View>
  );
}

// Espacio reservado mientras cargan los datos. Solo late si la persona no pidió reducir animaciones.
export function Esqueleto({ alto, ancho = '100%' }: { alto: number; ancho?: DimensionValue }) {
  const reducir = useReducirAnimacion();
  const opacidad = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducir) return;
    const pulso = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { duration: DURACION_PULSO_MS, toValue: 0.5, useNativeDriver: true }),
        Animated.timing(opacidad, { duration: DURACION_PULSO_MS, toValue: 1, useNativeDriver: true }),
      ]),
    );
    pulso.start();
    return () => pulso.stop();
  }, [opacidad, reducir]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.esqueleto, { height: alto, opacity: opacidad, width: ancho }]}
    />
  );
}

// Decorativo: rebota en su lugar y se detiene. No recorre nada para no sugerir la posición de un camión.
export function CamionDecorativo({ color }: { color: string }) {
  const reducir = useReducirAnimacion();
  const rebote = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (reducir) return;
      const pasos = Array.from({ length: REBOTES_CAMION }, () => [
        Animated.timing(rebote, { duration: PASO_CAMION_MS, toValue: 1, useNativeDriver: true }),
        Animated.timing(rebote, { duration: PASO_CAMION_MS, toValue: 0, useNativeDriver: true }),
      ]).flat();
      const animacion = Animated.sequence(pasos);
      animacion.start();
      return () => animacion.stop();
    }, [rebote, reducir]),
  );

  const y = rebote.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <MaterialCommunityIcons color={color} name="truck-outline" size={24} style={estilos.volteado} />
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  esqueleto: { backgroundColor: COLORES.inactivo, borderRadius: RADIO.grande },
  volteado: { transform: [{ scaleX: -1 }] },
});
