import {
  AVISO_REPORTES_DEMOSTRACION,
  COLORES,
  fechaHoraLegible,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  type Reporte,
  type TipoReporte,
} from '@carmen-limpio/compartido';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton, FilaNavegable, IconoCirculo, PantallaVacia } from '../../componentes/ui';
import { useDemo } from '../../estado/demo';
import { FUENTE, TEXTO } from '../../estilos/tema';

const TIPOS: { tipo: TipoReporte; icono: 'bus' | 'trash' | 'warning' }[] = [
  { icono: 'bus', tipo: 'noPaso' },
  { icono: 'trash', tipo: 'acumulacion' },
  { icono: 'warning', tipo: 'tiradero' },
];

function descripcionDe(reporte: Reporte) {
  const lugar = reporte.lugarId ? lugarPorId(reporte.lugarId)?.nombre : 'Punto en el mapa';
  return `${lugar ?? 'Lugar'} · ${NOMBRE_ESTADO_REPORTE[reporte.estado]}`;
}

export default function Reportes() {
  const { cargado, sesion, reportes, salir, borrarTodo } = useDemo();

  if (!cargado) return null;

  if (!sesion) {
    return (
      <PantallaVacia
        icono="document-text"
        texto="Prueba cómo sería registrar que el camión no pasó, una acumulación de basura o un tiradero clandestino. No necesitas contraseña ni datos reales."
        titulo="Reportes de demostración"
      >
        <View style={estilos.acciones}>
          <Aviso>{AVISO_REPORTES_DEMOSTRACION}</Aviso>
          <Boton icono="log-in" onPress={() => router.push('/reportes/privacidad')} texto="Entrar a la demostración" />
        </View>
      </PantallaVacia>
    );
  }

  const confirmarBorrado = () =>
    Alert.alert('Borrar datos de demostración', 'Se borrarán tus reportes y sus fotos de este teléfono.', [
      { style: 'cancel', text: 'Cancelar' },
      { onPress: () => borrarTodo(), style: 'destructive', text: 'Borrar' },
    ]);

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <Aviso>{AVISO_REPORTES_DEMOSTRACION}</Aviso>

      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        Nuevo reporte
      </Text>
      {TIPOS.map(({ tipo, icono }) => (
        <FilaNavegable
          inicio={<IconoCirculo icono={icono} />}
          key={tipo}
          onPress={() => router.push(`/reportes/nuevo?tipo=${tipo}`)}
          titulo={NOMBRE_TIPO_REPORTE[tipo]}
        />
      ))}

      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        Mis reportes
      </Text>
      {reportes.length === 0 && <Text style={TEXTO.cuerpo}>Aún no tienes reportes.</Text>}
      {reportes.map((reporte) => (
        <FilaNavegable
          detalle={<Text style={TEXTO.apoyo}>{fechaHoraLegible(reporte.creado)}</Text>}
          key={reporte.id}
          onPress={() => router.push(`/reportes/${reporte.id}`)}
          subtitulo={descripcionDe(reporte)}
          titulo={NOMBRE_TIPO_REPORTE[reporte.tipo]}
        />
      ))}

      <View style={estilos.pie}>
        <Text style={TEXTO.apoyo}>{sesion.nombre}</Text>
        <View style={estilos.enlaces}>
          {reportes.length > 0 && (
            <Pressable accessibilityRole="button" onPress={confirmarBorrado} style={estilos.enlace}>
              <Text style={estilos.enlaceTexto}>Borrar mis datos</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => salir()} style={estilos.enlace}>
            <Text style={estilos.enlaceTexto}>Salir</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 12, padding: 20 },
  acciones: { gap: 12 },
  pie: { gap: 4, paddingTop: 12 },
  enlaces: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  enlace: { justifyContent: 'center', minHeight: 48 },
  enlaceTexto: { color: COLORES.primario, fontFamily: FUENTE, fontSize: 16, fontWeight: '600' },
});
