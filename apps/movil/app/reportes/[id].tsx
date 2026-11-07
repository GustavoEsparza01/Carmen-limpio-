import {
  AVISO_REPORTES_DEMOSTRACION,
  COLORES,
  fechaHoraLegible,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  pasosDeLinea,
  siguientesEstados,
  type EstadoReporte,
  type Reporte,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton } from '../../componentes/ui';
import { useDemo } from '../../estado/demo';
import { CONTENIDO, RADIO, TARJETA, TEXTO } from '../../estilos/tema';

function LineaDeTiempo({ reporte }: { reporte: Reporte }) {
  const pasos = pasosDeLinea(reporte);
  return (
    <View accessibilityLabel={`Estado actual: ${NOMBRE_ESTADO_REPORTE[reporte.estado]}`} accessible={false}>
      {pasos.map((estado, indice) => {
        const evento = reporte.historial.find((e) => e.estado === estado);
        const ultimo = indice === pasos.length - 1;
        const rechazado = estado === 'rechazado';
        return (
          <View key={estado} style={estilos.paso}>
            <View style={estilos.guia}>
              <View style={[estilos.marca, evento && estilos.marcaHecha]}>
                {evento && <Ionicons color={COLORES.superficie} name={rechazado ? 'close' : 'checkmark'} size={16} />}
              </View>
              {!ultimo && <View style={[estilos.linea, evento && estilos.lineaHecha]} />}
            </View>
            <View style={estilos.pasoTexto}>
              <Text style={evento ? TEXTO.fila : TEXTO.apoyo}>
                {NOMBRE_ESTADO_REPORTE[estado]}
                {evento ? '' : ' (pendiente)'}
              </Text>
              {evento && <Text style={TEXTO.apoyo}>{fechaHoraLegible(evento.fecha)}</Text>}
              {evento && <Text style={TEXTO.apoyo}>{evento.nota}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function DetalleReporte() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reportes, cambiarEstado } = useDemo();
  const reporte = reportes.find((r) => r.id === id);

  if (!reporte) return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No encontramos este reporte.</Text>;

  const lugar = reporte.lugarId ? lugarPorId(reporte.lugarId) : undefined;
  const siguientes: readonly EstadoReporte[] = siguientesEstados(reporte.estado);

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={TEXTO.titulo}>
          {NOMBRE_TIPO_REPORTE[reporte.tipo]}
        </Text>
        <Text style={TEXTO.fila}>Estado: {NOMBRE_ESTADO_REPORTE[reporte.estado]}</Text>
      </View>
      <Aviso>{AVISO_REPORTES_DEMOSTRACION}</Aviso>

      <View style={estilos.tarjeta}>
        {lugar && <Text style={TEXTO.fila}>{lugar.nombre}</Text>}
        {reporte.fecha && <Text style={TEXTO.cuerpo}>Fecha: {reporte.fecha.split('-').reverse().join('/')}</Text>}
        {reporte.punto && <Text style={TEXTO.cuerpo}>Punto marcado en el mapa</Text>}
        {reporte.descripcion && <Text style={TEXTO.cuerpo}>{reporte.descripcion}</Text>}
        {reporte.fotoUri && <Image accessibilityLabel="Foto del reporte" source={{ uri: reporte.fotoUri }} style={estilos.foto} />}
      </View>

      <View style={estilos.tarjeta}>
        <Text style={TEXTO.subtitulo}>Seguimiento</Text>
        <LineaDeTiempo reporte={reporte} />
      </View>

      {siguientes.length > 0 && (
        <View style={estilos.tarjeta}>
          <Text style={TEXTO.fila}>Solo para la demostración</Text>
          <Text style={TEXTO.apoyo}>Nadie revisa este reporte: estos botones simulan el seguimiento.</Text>
          {siguientes.map((estado) => (
            <Boton
              icono="play-forward"
              key={estado}
              onPress={() => cambiarEstado(reporte.id, estado)}
              texto={`Simular: ${NOMBRE_ESTADO_REPORTE[estado]}`}
              variante="secundario"
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  encabezado: { gap: 2 },
  tarjeta: { ...TARJETA, gap: 10, padding: 16 },
  foto: { borderRadius: RADIO.grande, height: 200, width: '100%' },
  paso: { flexDirection: 'row', gap: 12 },
  guia: { alignItems: 'center', width: 26 },
  marca: {
    alignItems: 'center',
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.completo,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  marcaHecha: { backgroundColor: COLORES.primario, borderColor: COLORES.primario },
  linea: { backgroundColor: COLORES.borde, flex: 1, minHeight: 16, width: 3 },
  lineaHecha: { backgroundColor: COLORES.primario },
  pasoTexto: { flex: 1, gap: 2, paddingBottom: 14 },
});
