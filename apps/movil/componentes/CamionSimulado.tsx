import {
  COLORES,
  duracionSimulacion,
  medirRecorrido,
  posicionEnRecorrido,
  type Coordenadas,
} from '@carmen-limpio/compartido';
import { Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { RADIO, TEXTO } from '../estilos/tema';

const INTERVALO_MS = 50;

// La caja va lisa a propósito: sin el mural ni el lema de la empresa recolectora.
const IMAGEN = require('../assets/camion-simulado.png');
const ANCHO_CAMION = 92;
const ALTO_CAMION = 42;

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
        <Image
          resizeMode="contain"
          source={IMAGEN}
          style={[estilos.imagen, !posicion.haciaElOeste && estilos.volteado]}
        />
        <Text style={estilos.etiqueta}>Simulación</Text>
      </View>
    </Marker>
  );
}

const estilos = StyleSheet.create({
  camion: { alignItems: 'center', gap: 2 },
  imagen: { height: ALTO_CAMION, width: ANCHO_CAMION },
  // La imagen mira a la izquierda.
  volteado: { transform: [{ scaleX: -1 }] },
  etiqueta: {
    ...TEXTO.pequeno,
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.chico,
    color: COLORES.acentoTexto,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
