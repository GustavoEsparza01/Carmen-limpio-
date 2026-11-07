import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_POR_CONFIRMAR,
  AVISO_SIN_PERMISO,
  COLORES,
  descripcionRecordatorio,
  ETIQUETA_TIPO,
  lugarPorId,
  NOMBRE_ETIQUETA,
  NOMBRE_RECORDATORIO,
  textoCompartir,
  textoHorario,
  tieneMapa,
  type EtiquetaLugar,
  type Recordatorio,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, Boton, DiasSemana, EtiquetaTurno, Pastilla } from '../../componentes/ui';
import { useGuardados } from '../../estado/guardados';
import { FUENTE, TARJETA, TEXTO } from '../../estilos/tema';

const ETIQUETAS: EtiquetaLugar[] = ['casa', 'trabajo', 'otro'];
const RECORDATORIOS: Recordatorio[] = ['ninguno', 'nocheAnterior', 'antesDeVentana'];

export default function DetalleLugar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guardados, guardar, quitar, cambiarRecordatorio } = useGuardados();
  const [sinPermiso, setSinPermiso] = useState(false);
  const lugar = lugarPorId(id);

  if (!lugar) {
    return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No encontramos este lugar.</Text>;
  }

  const guardado = guardados.find((g) => g.lugarId === lugar.id);
  const descripcion = guardado ? descripcionRecordatorio(guardado.recordatorio) : null;
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

      <View style={estilos.tarjeta}>
        <Text style={TEXTO.fila}>{guardado ? 'Guardado como' : 'Guardar como'}</Text>
        <View style={estilos.opciones}>
          {ETIQUETAS.map((etiqueta) => (
            <Pastilla
              activa={guardado?.etiqueta === etiqueta}
              key={etiqueta}
              onPress={() => guardar(lugar.id, etiqueta)}
              texto={NOMBRE_ETIQUETA[etiqueta]}
            />
          ))}
        </View>
        {guardado && (
          <>
            <Text style={TEXTO.fila}>Recordatorio</Text>
            <View style={estilos.opciones}>
              {RECORDATORIOS.map((tipo) => (
                <Pastilla
                  activa={guardado.recordatorio === tipo}
                  key={tipo}
                  onPress={async () => setSinPermiso(!(await cambiarRecordatorio(lugar.id, tipo)))}
                  texto={NOMBRE_RECORDATORIO[tipo]}
                />
              ))}
            </View>
            {descripcion && <Text style={TEXTO.apoyo}>{descripcion}</Text>}
            {sinPermiso && <Aviso icono="notifications-off">{AVISO_SIN_PERMISO}</Aviso>}
            <Boton icono="bookmark" onPress={() => quitar(lugar.id)} texto="Quitar de mis lugares" variante="secundario" />
          </>
        )}
      </View>

      <Boton
        icono="share-social"
        onPress={() => Share.share({ message: textoCompartir(lugar) }).catch(() => {})}
        texto="Compartir horario"
        variante="secundario"
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
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
