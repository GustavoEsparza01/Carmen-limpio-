import { AVISO_AVISOS_EJEMPLO, COLORES, type AvisoCiudad, type TipoAviso } from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado } from '../../componentes/ui';
import { avisos as servicioAvisos } from '../../estado/demo';
import { FUENTE, RADIO, TARJETA, TEXTO } from '../../estilos/tema';

const ICONO: Record<TipoAviso, 'time' | 'pause-circle' | 'leaf'> = {
  general: 'leaf',
  horario: 'time',
  servicio: 'pause-circle',
};

export default function Avisos() {
  const [avisos, setAvisos] = useState<AvisoCiudad[]>([]);

  useEffect(() => {
    servicioAvisos.listar().then(setAvisos).catch(() => {});
  }, []);

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Aviso>{AVISO_AVISOS_EJEMPLO}</Aviso>
      {avisos.map(({ id, tipo, titulo, texto }) => (
        <View key={id} style={estilos.tarjeta}>
          <View style={estilos.encabezado}>
            <Ionicons color={COLORES.primario} name={ICONO[tipo]} size={22} />
            <View style={estilos.etiqueta}>
              <Text style={estilos.etiquetaTexto}>Ejemplo</Text>
            </View>
          </View>
          <Text style={TEXTO.fila}>{titulo}</Text>
          <Text style={TEXTO.cuerpo}>{texto}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 12, padding: 20 },
  tarjeta: { ...TARJETA, gap: 8, padding: 16 },
  encabezado: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  etiqueta: {
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.completo,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  etiquetaTexto: { color: COLORES.acentoTexto, fontFamily: FUENTE, fontSize: 14, fontWeight: '600' },
});
