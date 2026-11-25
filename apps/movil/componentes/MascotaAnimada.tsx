import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducirAnimacion } from '../estado/animacion';
import { Mascota } from './Mascota';

export type EstadoMascota = 'saludo' | 'reposo' | 'escuchando' | 'pensando' | 'hablando';

// Hay una sola imagen: cada estado se distingue por cómo se mueve. El texto junto a ella dice lo mismo.
const MOVIMIENTO: Record<
  Exclude<EstadoMascota, 'reposo'>,
  { duracion: number; giro: number; salto: number; veces: number }
> = {
  saludo: { duracion: 170, giro: 10, salto: 2, veces: 3 },
  escuchando: { duracion: 650, giro: 7, salto: 0, veces: -1 },
  pensando: { duracion: 420, giro: 0, salto: 6, veces: -1 },
  hablando: { duracion: 210, giro: 4, salto: 2, veces: -1 },
};

export function MascotaAnimada({ tamano, estado }: { tamano: number; estado: EstadoMascota }) {
  const reducir = useReducirAnimacion();
  const vaiven = useRef(new Animated.Value(0)).current;
  const { duracion, giro, salto, veces } = MOVIMIENTO[estado === 'reposo' ? 'saludo' : estado];
  const quieta = reducir || estado === 'reposo';

  useEffect(() => {
    if (quieta) {
      Animated.timing(vaiven, { duration: reducir ? 0 : 150, toValue: 0, useNativeDriver: true }).start();
      return;
    }
    const paso = (toValue: number) =>
      Animated.timing(vaiven, { duration: duracion, easing: Easing.inOut(Easing.quad), toValue, useNativeDriver: true });
    const animacion = Animated.loop(Animated.sequence([paso(1), paso(-1), paso(0)]), { iterations: veces });
    animacion.start();
    return () => animacion.stop();
  }, [duracion, quieta, reducir, vaiven, veces]);

  const rotate = vaiven.interpolate({ inputRange: [-1, 1], outputRange: [`${-giro}deg`, `${giro}deg`] });
  const translateY = vaiven.interpolate({ inputRange: [-1, 0, 1], outputRange: [-salto, 0, -salto] });
  return (
    <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
      <Mascota tamano={tamano} />
    </Animated.View>
  );
}
