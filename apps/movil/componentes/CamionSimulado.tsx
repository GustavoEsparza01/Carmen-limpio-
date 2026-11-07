import {
  COLORES,
  duracionSimulacion,
  medirRecorrido,
  posicionEnRecorrido,
  type Coordenadas,
} from '@carmen-limpio/compartido';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FUENTE, RADIO, SOMBRA } from '../estilos/tema';

const INTERVALO_MS = 50;

// Va dentro de <Mapa>. Tiene su propio estado para no redibujar toda la pantalla en cada paso.
export function CamionSimulado({ linea }: { linea: Coordenadas[] }) {
  const recorrido = useMemo(() => medirRecorrido(linea), [linea]);
  const [posicion, setPosicion] = useState(() => posicionEnRecorrido(recorrido, 0));

  useEffect(() => {
    const duracion = duracionSimulacion(recorrido.longitud);
    const inicio = Date.now();
    const temporizador = setInterval(() => {
      const avance = ((Date.now() - inicio) % duracion) / duracion;
      setPosicion(posicionEnRecorrido(recorrido, avance * recorrido.longitud));
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [recorrido]);

  return (
    <Marker id="camion-simulado" lngLat={posicion.coordenadas}>
      <View accessibilityLabel="Camión simulado" style={estilos.camion}>
        <View style={estilos.circulo}>
          <MaterialCommunityIcons
            color={COLORES.superficie}
            name="truck"
            size={24}
            style={posicion.haciaElOeste ? undefined : estilos.volteado}
          />
        </View>
        <Text style={estilos.etiqueta}>Simulación</Text>
      </View>
    </Marker>
  );
}

const estilos = StyleSheet.create({
  camion: { alignItems: 'center', gap: 2 },
  circulo: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.acentoTexto,
    borderColor: COLORES.superficie,
    borderRadius: RADIO.completo,
    borderWidth: 2,
    elevation: 6,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  volteado: { transform: [{ scaleX: -1 }] },
  etiqueta: {
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.chico,
    color: COLORES.acentoTexto,
    fontFamily: FUENTE,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
