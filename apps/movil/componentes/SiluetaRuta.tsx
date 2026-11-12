import { colorDeRuta, COLORES, siluetaDeRuta, type Ruta } from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FUENTE, RADIO } from '../estilos/tema';

export const ANCHO_SILUETA = 124;
export const ALTO_SILUETA = 88;
const GROSOR = 3;

// Vistas giradas en lugar de SVG: evita un módulo nativo más solo para dibujar una línea.
export const SiluetaRuta = memo(function SiluetaRuta({ ruta }: { ruta: Ruta }) {
  const segmentos = useMemo(() => siluetaDeRuta(ruta, ANCHO_SILUETA, ALTO_SILUETA, GROSOR + 3), [ruta]);

  if (!segmentos) {
    return (
      <View style={[estilos.caja, estilos.sinForma]}>
        <Ionicons color={COLORES.textoSuave} name="help-circle-outline" size={22} />
        <Text style={estilos.sinFormaTexto}>Sin forma</Text>
      </View>
    );
  }

  const color = colorDeRuta(ruta.numero);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={estilos.caja}>
      {segmentos.map(({ x1, y1, x2, y2, largo, angulo }, indice) => (
        <View
          key={indice}
          style={[
            estilos.segmento,
            {
              backgroundColor: color,
              left: (x1 + x2) / 2 - (largo + GROSOR) / 2,
              top: (y1 + y2) / 2 - GROSOR / 2,
              transform: [{ rotate: `${angulo}rad` }],
              width: largo + GROSOR,
            },
          ]}
        />
      ))}
    </View>
  );
});

const estilos = StyleSheet.create({
  caja: {
    backgroundColor: COLORES.fondo,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: StyleSheet.hairlineWidth,
    height: ALTO_SILUETA,
    overflow: 'hidden',
    width: ANCHO_SILUETA,
  },
  segmento: { borderRadius: GROSOR / 2, height: GROSOR, position: 'absolute' },
  sinForma: { alignItems: 'center', gap: 2, justifyContent: 'center', padding: 6 },
  sinFormaTexto: {
    color: COLORES.textoSuave,
    fontFamily: FUENTE,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
