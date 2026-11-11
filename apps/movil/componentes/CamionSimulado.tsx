import {
  COLORES,
  duracionSimulacion,
  interpolar,
  medirRecorrido,
  posicionEnRecorrido,
  type Coordenadas,
  type PosicionSimulada,
} from '@carmen-limpio/compartido';
import { Marker } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { RADIO, TEXTO } from '../estilos/tema';

const INTERVALO_MS = 50;
// Lo que tarda en llegar la siguiente posición del servidor (simular_camiones corre cada 10 s).
const PASO_REMOTO_MS = 10_000;

// Diseño del usuario, con los logos de SOS de la Isla por decisión suya (ver docs/decisiones.md).
const IMAGEN = require('../assets/camion-simulado.png');
const ANCHO_CAMION = 92;
const ALTO_CAMION = 42;

function MarcadorCamion({ coordenadas, haciaElOeste }: PosicionSimulada) {
  return (
    <Marker id="camion-simulado" lngLat={coordenadas}>
      <View accessibilityLabel="Camión simulado" style={estilos.camion}>
        <Image resizeMode="contain" source={IMAGEN} style={[estilos.imagen, !haciaElOeste && estilos.volteado]} />
        <Text style={estilos.etiqueta}>Simulación</Text>
      </View>
    </Marker>
  );
}

// Sin Supabase: el teléfono recorre la línea a velocidad de demostración.
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

  return <MarcadorCamion {...posicion} />;
}

// Con Supabase: cada posición nueva llega cada 10 s; entre una y otra el camión avanza en línea recta.
export function CamionRemoto({ punto }: { punto: Coordenadas }) {
  const anterior = useRef<Coordenadas>(punto);
  const [posicion, setPosicion] = useState<PosicionSimulada>({ coordenadas: punto, haciaElOeste: false });

  useEffect(() => {
    const desde = anterior.current;
    const hacia = punto;
    anterior.current = punto;
    // Un salto grande es el inicio de otra vuelta: se coloca sin recorrer la línea recta.
    const salto = Math.abs(hacia[0] - desde[0]) + Math.abs(hacia[1] - desde[1]) > 0.02;
    const haciaElOeste = hacia[0] < desde[0];
    if (salto) {
      setPosicion({ coordenadas: hacia, haciaElOeste });
      return;
    }
    const inicio = Date.now();
    const temporizador = setInterval(() => {
      const t = (Date.now() - inicio) / PASO_REMOTO_MS;
      setPosicion({ coordenadas: interpolar(desde, hacia, t), haciaElOeste });
      if (t >= 1) clearInterval(temporizador);
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [punto]);

  return <MarcadorCamion {...posicion} />;
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
