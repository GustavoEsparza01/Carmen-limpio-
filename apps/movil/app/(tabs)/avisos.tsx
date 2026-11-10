import {
  AVISO_AVISOS_EJEMPLO,
  AVISO_AVISOS_EQUIPO,
  AVISOS_SIN_CONEXION,
  AVISOS_VACIO,
  COLORES,
  type AvisoCiudad,
  type TipoAviso,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton, PantallaVacia } from '../../componentes/ui';
import { avisosReales, listarAvisos } from '../../estado/avisos';
import { CONTENIDO, FUENTE, RADIO, TARJETA, TEXTO } from '../../estilos/tema';

const ICONO: Record<TipoAviso, 'time' | 'pause-circle' | 'leaf'> = {
  general: 'leaf',
  horario: 'time',
  servicio: 'pause-circle',
};

type Estado = { tipo: 'cargando' } | { tipo: 'listo'; avisos: AvisoCiudad[] } | { tipo: 'error' };

export default function Avisos() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  const cargar = useCallback(() => {
    listarAvisos()
      .then((avisos) => setEstado({ tipo: 'listo', avisos }))
      .catch(() => setEstado({ tipo: 'error' }));
  }, []);

  // Al volver a la pestaña se consulta de nuevo: un aviso nuevo aparece sin reiniciar la app.
  useFocusEffect(cargar);

  if (estado.tipo === 'error') {
    return (
      <PantallaVacia icono="cloud-offline" titulo={AVISOS_SIN_CONEXION.titulo} texto={AVISOS_SIN_CONEXION.texto}>
        <Boton
          onPress={() => {
            setEstado({ tipo: 'cargando' });
            cargar();
          }}
          icono="refresh"
          texto="Reintentar"
        />
      </PantallaVacia>
    );
  }

  if (estado.tipo === 'listo' && estado.avisos.length === 0) {
    return <PantallaVacia icono="megaphone-outline" titulo={AVISOS_VACIO.titulo} texto={AVISOS_VACIO.texto} />;
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Aviso>{avisosReales ? AVISO_AVISOS_EQUIPO : AVISO_AVISOS_EJEMPLO}</Aviso>
      {estado.tipo === 'listo' &&
        estado.avisos.map(({ id, tipo, titulo, texto }) => (
          <View key={id} style={estilos.tarjeta}>
            <View style={estilos.encabezado}>
              <Ionicons color={COLORES.primario} name={ICONO[tipo]} size={22} />
              {!avisosReales && (
                <View style={estilos.etiqueta}>
                  <Text style={estilos.etiquetaTexto}>Ejemplo</Text>
                </View>
              )}
            </View>
            <Text style={TEXTO.fila}>{titulo}</Text>
            <Text style={TEXTO.cuerpo}>{texto}</Text>
          </View>
        ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
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
