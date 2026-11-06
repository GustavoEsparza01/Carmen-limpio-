import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_POR_CONFIRMAR,
  COLORES,
  ETIQUETA_TIPO,
  lugarPorId,
  textoHorario,
  tieneMapa,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton, DiasSemana, EtiquetaTurno } from '../../componentes/ui';
import { useFavorita } from '../../estado/favorita';
import { FUENTE, TARJETA, TEXTO } from '../../estilos/tema';

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { favoritaId, cambiarFavorita } = useFavorita();
  const lugar = lugarPorId(id);

  if (!lugar) {
    return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No encontramos este lugar.</Text>;
  }

  const guardada = favoritaId === lugar.id;
  const tipo = ETIQUETA_TIPO[lugar.tipo];

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <BarraEstado estilo="dark" />
      <View>
        <Text style={TEXTO.titulo} accessibilityRole="header">
          {lugar.nombre}
        </Text>
        {tipo && <Text style={TEXTO.cuerpo}>{tipo}</Text>}
      </View>

      {lugar.horarios.map((h) => (
        <View key={h.rutaId} style={estilos.tarjeta}>
          <View style={estilos.tarjetaEncabezado}>
            <Text style={TEXTO.fila}>Ruta {h.numero}</Text>
            <EtiquetaTurno turno={h.turno} />
          </View>
          <DiasSemana dias={h.dias} />
          <Text style={estilos.horario}>{textoHorario(h.dias, h.turno)}</Text>
          {h.porConfirmar && (
            <View style={estilos.porConfirmar}>
              <Ionicons color={COLORES.acentoTexto} name="alert-circle" size={18} />
              <Text style={estilos.porConfirmarTexto}>{AVISO_POR_CONFIRMAR}</Text>
            </View>
          )}
          {h.confianza !== 'ninguna' && (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(`/mapa/${h.rutaId}?lugar=${lugar.id}`)}
              style={estilos.enlace}
            >
              <Ionicons color={COLORES.primario} name="map" size={18} />
              <Text style={estilos.enlaceTexto}>Ver en el mapa</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!tieneMapa(lugar) && (
        <Aviso icono="map">Todavía no tenemos este lugar en el mapa. Su horario sí aparece en los carteles.</Aviso>
      )}

      <Boton
        icono={guardada ? 'bookmark' : 'bookmark-outline'}
        onPress={() => cambiarFavorita(guardada ? null : lugar.id)}
        texto={guardada ? 'Quitar de mi lugar guardado' : 'Guardar como mi lugar'}
        variante={guardada ? 'secundario' : 'principal'}
      />

      <Text style={TEXTO.apoyo}>{AVISO_HORARIOS}</Text>
      <Aviso>{AVISO_NO_OFICIAL}</Aviso>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 14, padding: 20 },
  tarjeta: { ...TARJETA, gap: 12, padding: 16 },
  tarjetaEncabezado: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  horario: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 17, fontWeight: '600', lineHeight: 24 },
  porConfirmar: { alignItems: 'flex-start', flexDirection: 'row', gap: 6 },
  porConfirmarTexto: {
    color: COLORES.acentoTexto,
    flex: 1,
    fontFamily: FUENTE,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  enlace: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 44 },
  enlaceTexto: { color: COLORES.primario, fontFamily: FUENTE, fontSize: 16, fontWeight: '600' },
});
