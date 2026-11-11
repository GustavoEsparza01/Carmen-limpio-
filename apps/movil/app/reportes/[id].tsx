import {
  AVISO_REPORTES,
  COLORES,
  fechaHoraLegible,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  pasosDeLinea,
  type Reporte,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Esqueleto } from '../../componentes/movimiento';
import { Aviso, BarraEstado } from '../../componentes/ui';
import { useCuenta } from '../../estado/cuenta';
import { CONTENIDO, RADIO, TARJETA, TEXTO } from '../../estilos/tema';

function LineaDeTiempo({ reporte }: { reporte: Reporte }) {
  const pasos = pasosDeLinea(reporte);
  return (
    <View accessibilityLabel={`Estado actual: ${NOMBRE_ESTADO_REPORTE[reporte.estado]}`} accessible={false}>
      {pasos.map((estado, indice) => {
        // El último evento de cada estado: es el que trae la nota vigente.
        const evento = reporte.historial.findLast((e) => e.estado === estado);
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
              {evento && <Text style={TEXTO.cuerpo}>{evento.nota}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// El bucket es privado: la foto se pide con una URL firmada por una hora.
function Foto({ ruta }: { ruta: string }) {
  const { fotoFirmada } = useCuenta();
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    fotoFirmada(ruta).then((u) => vigente && setUrl(u));
    return () => {
      vigente = false;
    };
  }, [ruta, fotoFirmada]);

  if (url === undefined) return <Esqueleto alto={200} />;
  if (url === null) return <Text style={TEXTO.apoyo}>No pudimos cargar la foto. Revisa tu conexión.</Text>;
  return <Image accessibilityLabel="Foto del reporte" source={{ uri: url }} style={estilos.foto} />;
}

export default function DetalleReporte() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reportes, cargandoReportes } = useCuenta();
  const reporte = reportes.find((r) => r.id === id);

  if (!reporte) {
    if (cargandoReportes) {
      return (
        <View style={estilos.contenido}>
          <Esqueleto alto={72} />
          <Esqueleto alto={160} />
        </View>
      );
    }
    return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No encontramos este reporte.</Text>;
  }

  const lugar = reporte.lugarId ? lugarPorId(reporte.lugarId) : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={TEXTO.titulo}>
          {NOMBRE_TIPO_REPORTE[reporte.tipo]}
        </Text>
        <Text style={TEXTO.fila}>Estado: {NOMBRE_ESTADO_REPORTE[reporte.estado]}</Text>
        <Text style={TEXTO.apoyo}>Enviado el {fechaHoraLegible(reporte.creado)}</Text>
      </View>

      <View style={estilos.nota}>
        <Text style={TEXTO.fila}>Nota del equipo</Text>
        <Text style={TEXTO.cuerpo}>{reporte.nota}</Text>
      </View>

      <View style={estilos.tarjeta}>
        {lugar && <Text style={TEXTO.fila}>{lugar.nombre}</Text>}
        {reporte.fecha && <Text style={TEXTO.cuerpo}>Fecha: {reporte.fecha.split('-').reverse().join('/')}</Text>}
        {reporte.punto && <Text style={TEXTO.cuerpo}>Punto marcado en el mapa</Text>}
        {reporte.descripcion && <Text style={TEXTO.cuerpo}>{reporte.descripcion}</Text>}
        {reporte.foto && <Foto ruta={reporte.foto} />}
      </View>

      <View style={estilos.tarjeta}>
        <Text style={TEXTO.subtitulo}>Seguimiento</Text>
        <LineaDeTiempo reporte={reporte} />
      </View>

      <Aviso>{AVISO_REPORTES}</Aviso>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  encabezado: { gap: 2 },
  nota: { ...TARJETA, backgroundColor: COLORES.primarioSuave, gap: 6, padding: 16 },
  tarjeta: { ...TARJETA, gap: 10, padding: 16 },
  foto: { borderRadius: RADIO.grande, height: 220, width: '100%' },
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
