import {
  AVISO_FUENTE_HOY,
  AVISO_POR_CONFIRMAR,
  COLORES,
  estadoDeHoy,
  listaDias,
  type Dia,
  type Horario,
  type Lugar,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR_ESTADO_HOY, FUENTE, RADIO, TARJETA, TEXTO } from '../estilos/tema';
import { CamionDecorativo } from './movimiento';
import { Boton, DiasSemana, EtiquetaTurno } from './ui';

// Cada ruta con sus propios días: un lugar puede estar en dos rutas con días distintos (Bivalvo).
function FilaRuta({ horario, hoy }: { horario: Horario; hoy: Dia }) {
  return (
    <View
      accessibilityLabel={`Ruta ${horario.numero}, turno ${horario.turno}: ${listaDias(horario.dias)}`}
      style={estilos.filaRuta}
    >
      <DiasSemana dias={horario.dias} hoy={hoy} />
      <View style={estilos.ruta}>
        <Text style={TEXTO.fila}>Ruta {horario.numero}</Text>
        <EtiquetaTurno conHorario turno={horario.turno} />
      </View>
      {horario.porConfirmar && <Text style={estilos.porConfirmar}>{AVISO_POR_CONFIRMAR}</Text>}
    </View>
  );
}

export function TarjetaHoy({ lugar, ahora }: { lugar: Lugar; ahora: Date }) {
  const hoy = estadoDeHoy(lugar.horarios, ahora);
  if (!hoy) return null;

  const { estado, mensaje, dia } = hoy;
  const { fondo, texto, icono, etiqueta } = COLOR_ESTADO_HOY[estado];
  const conMapa = lugar.horarios.filter((h) => h.confianza !== 'ninguna');

  return (
    <View style={estilos.tarjeta}>
      <Pressable
        accessibilityHint="Abre el horario completo"
        accessibilityLabel={`${lugar.nombre}. ${etiqueta}. ${mensaje}`}
        accessibilityRole="button"
        onPress={() => router.push(`/lugar/${lugar.id}`)}
        style={({ pressed }) => [estilos.estado, { backgroundColor: fondo }, pressed && estilos.presionado]}
      >
        <View style={estilos.encabezado}>
          <Ionicons color={texto} name="bookmark" size={16} />
          <Text numberOfLines={2} style={[estilos.lugar, { color: texto }]}>
            {lugar.nombre}
          </Text>
          <Ionicons color={texto} name="chevron-forward" size={20} />
        </View>
        <View style={estilos.etiqueta}>
          <Ionicons color={texto} name={icono} size={18} />
          <Text style={[estilos.etiquetaTexto, { color: texto }]}>{etiqueta}</Text>
          {(estado === 'antes' || estado === 'enCurso') && <CamionDecorativo color={texto} />}
        </View>
        <Text style={[estilos.mensaje, { color: texto }]}>{mensaje}</Text>
      </Pressable>

      <View style={estilos.detalle}>
        {lugar.horarios.map((h) => (
          <FilaRuta hoy={dia} horario={h} key={h.rutaId} />
        ))}
        {conMapa.map((h) => (
          <Boton
            icono="map"
            key={h.rutaId}
            onPress={() => router.push(`/mapa/${h.rutaId}?lugar=${lugar.id}`)}
            texto={`Ver mapa de la Ruta ${h.numero}`}
            variante="secundario"
          />
        ))}
        {conMapa.length === 0 && <Text style={TEXTO.apoyo}>Este lugar aún no está ubicado en el mapa.</Text>}
        <Text style={estilos.fuente}>{AVISO_FUENTE_HOY}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { ...TARJETA, overflow: 'hidden' },
  estado: { gap: 10, padding: 18 },
  presionado: { opacity: 0.85 },
  encabezado: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  lugar: { flex: 1, fontFamily: FUENTE, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  etiqueta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  etiquetaTexto: { fontFamily: FUENTE, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  mensaje: { fontFamily: FUENTE, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  detalle: { gap: 12, padding: 16 },
  filaRuta: { gap: 10 },
  ruta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  porConfirmar: {
    ...TEXTO.alerta,
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.chico,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fuente: TEXTO.apoyo,
});
