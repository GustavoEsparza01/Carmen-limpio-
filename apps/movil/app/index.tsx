import {
  AVISO_NO_OFICIAL,
  buscarLugares,
  COLORES,
  lugarPorId,
  RUTAS,
  textoHorario,
  type Lugar,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso, BarraEstado, DiasSemana, EtiquetaTurno, FilaNavegable, IconoCirculo } from '../componentes/ui';
import { useFavorita } from '../estado/favorita';
import { FUENTE, RADIO, SOMBRA, TARJETA, TEXTO } from '../estilos/tema';

function resumen(lugar: Lugar): string {
  const [primero] = lugar.horarios;
  if (lugar.horarios.length > 1 || !primero) return `${lugar.horarios.length} horarios`;
  return textoHorario(primero.dias, primero.turno);
}

function abrir(lugar: Lugar) {
  router.push(`/lugar/${lugar.id}`);
}

function LugarGuardado({ lugar }: { lugar: Lugar }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => abrir(lugar)}
      style={({ pressed }) => [estilos.guardado, pressed && estilos.guardadoPresionado]}
    >
      <View style={estilos.guardadoEncabezado}>
        <Ionicons color={COLORES.primario} name="bookmark" size={18} />
        <Text style={estilos.guardadoEtiqueta}>Tu lugar guardado</Text>
        <Ionicons color={COLORES.textoSuave} name="chevron-forward" size={20} />
      </View>
      <Text style={TEXTO.subtitulo}>{lugar.nombre}</Text>
      {lugar.horarios.map((h) => (
        <View key={h.rutaId} style={estilos.guardadoHorario}>
          <View style={estilos.guardadoRuta}>
            <Text style={TEXTO.apoyo}>Ruta {h.numero}</Text>
            <EtiquetaTurno conHorario turno={h.turno} />
          </View>
          <DiasSemana dias={h.dias} />
        </View>
      ))}
    </Pressable>
  );
}

export default function Inicio() {
  const { top } = useSafeAreaInsets();
  const { favoritaId } = useFavorita();
  const [consulta, setConsulta] = useState('');
  const resultados = useMemo(() => buscarLugares(consulta), [consulta]);
  const buscando = consulta.trim().length > 0;
  const favorita = favoritaId ? lugarPorId(favoritaId) : undefined;

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="light" />
      <View style={[estilos.encabezado, { paddingTop: top + 24 }]}>
        <Text style={estilos.titulo} accessibilityRole="header">
          Carmen Limpio
        </Text>
        <Text style={estilos.subtitulo}>¿Qué días pasa el camión por tu colonia?</Text>
      </View>

      <View style={estilos.buscador}>
        <Ionicons color={COLORES.textoSuave} name="search" size={22} />
        <TextInput
          accessibilityLabel="Buscar colonia, fraccionamiento o avenida"
          autoCorrect={false}
          onChangeText={setConsulta}
          placeholder="Busca tu colonia o avenida"
          placeholderTextColor={COLORES.textoSuave}
          returnKeyType="search"
          style={estilos.buscadorCampo}
          value={consulta}
        />
        {buscando && (
          <Pressable
            accessibilityLabel="Borrar búsqueda"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setConsulta('')}
          >
            <Ionicons color={COLORES.textoSuave} name="close-circle" size={22} />
          </Pressable>
        )}
      </View>

      {buscando ? (
        <FlatList
          contentContainerStyle={estilos.contenido}
          data={resultados}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(l) => l.id}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <IconoCirculo icono="search" />
              <Text style={estilos.vacioTexto}>
                No encontramos ese lugar. Prueba con solo una parte del nombre. Es posible que no aparezca en los
                carteles.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FilaNavegable
              inicio={<IconoCirculo icono="location" />}
              onPress={() => abrir(item)}
              subtitulo={resumen(item)}
              titulo={item.nombre}
            />
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={estilos.contenido}>
          {favorita ? (
            <LugarGuardado lugar={favorita} />
          ) : (
            <View style={estilos.vacio}>
              <IconoCirculo icono="location" />
              <Text style={estilos.vacioTexto}>
                Escribe el nombre de tu colonia para ver qué días pasa el camión.
              </Text>
            </View>
          )}
          <FilaNavegable
            inicio={<IconoCirculo icono="bus" />}
            onPress={() => router.push('/rutas')}
            subtitulo={`${RUTAS.length} rutas en dos turnos`}
            titulo="Ver todas las rutas"
          />
          <Aviso>{AVISO_NO_OFICIAL}</Aviso>
        </ScrollView>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  encabezado: {
    backgroundColor: COLORES.primario,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  titulo: { color: '#FFFFFF', fontFamily: FUENTE, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  subtitulo: {
    color: COLORES.primarioSuave,
    fontFamily: FUENTE,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 6,
  },
  buscador: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.grande,
    elevation: 4,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: -30,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  buscadorCampo: {
    color: COLORES.texto,
    flex: 1,
    fontFamily: FUENTE,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 56,
  },
  contenido: { gap: 12, padding: 20 },
  guardado: { ...TARJETA, gap: 12, padding: 16 },
  guardadoPresionado: { backgroundColor: COLORES.primarioSuave },
  guardadoEncabezado: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  guardadoEtiqueta: { ...TEXTO.seccion, color: COLORES.primario, flex: 1 },
  guardadoHorario: { gap: 8 },
  guardadoRuta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  vacio: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
  vacioTexto: { ...TEXTO.cuerpo, flex: 1 },
});
