import {
  AVISO_FUENTE_HOY,
  AVISO_POR_CONFIRMAR,
  COLORES,
  estadoDeHoy,
  type Horario,
  type Lugar,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR_ESTADO_HOY, FUENTE, RADIO, TARJETA, TEXTO } from '../estilos/tema';
import { CamionDecorativo } from './movimiento';
import { Boton, DiasSemana, EtiquetaTurno } from './ui';

function etiquetaRutas(horarios: readonly Horario[]) {
  const numeros = horarios.map((h) => h.numero);
  return numeros.length > 1 ? `Rutas ${numeros.join(' y ')}` : `Ruta ${numeros[0]}`;
}

export function TarjetaHoy({ lugar, ahora }: { lugar: Lugar; ahora: Date }) {
  const hoy = estadoDeHoy(lugar.horarios, ahora);
  if (!hoy) return null;

  const { estado, mensaje, dia, horarios, porConfirmar } = hoy;
  const { fondo, texto, icono, etiqueta } = COLOR_ESTADO_HOY[estado];
  const [{ turno } = lugar.horarios[0]!] = horarios;
  const conMapa = horarios.filter((h) => h.confianza !== 'ninguna');
  const dias = [...new Set(lugar.horarios.flatMap((h) => h.dias))];

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
        <DiasSemana dias={dias} hoy={dia} />
        <View style={estilos.ruta}>
          <Text style={TEXTO.fila}>{etiquetaRutas(horarios)}</Text>
          <EtiquetaTurno conHorario turno={turno} />
        </View>
        {porConfirmar && <Text style={estilos.porConfirmar}>{AVISO_POR_CONFIRMAR}</Text>}
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
