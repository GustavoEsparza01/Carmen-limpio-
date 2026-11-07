import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_SILUETA,
  COLORES,
  DIAS_CARTEL,
  lugaresUbicados,
  RUTAS,
  textoHorario,
  tieneSilueta,
  trazadoDeRuta,
  type Ruta,
  type Turno,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SiluetaRuta } from '../../componentes/SiluetaRuta';
import { Aviso, BarraEstado, EtiquetaTurno, InsigniaRuta, Pestanas } from '../../componentes/ui';
import { TARJETA, TEXTO } from '../../estilos/tema';

const TURNOS: { id: Turno; texto: string; icono: 'sunny' | 'moon' }[] = [
  { id: 'matutino', texto: 'Matutino', icono: 'sunny' },
  { id: 'vespertino', texto: 'Vespertino', icono: 'moon' },
];

function textoUbicados(ruta: Ruta) {
  const trazado = trazadoDeRuta(ruta.id);
  const ubicados = trazado ? lugaresUbicados(trazado) : 0;
  if (!tieneSilueta(ruta)) return `${ubicados} de ${ruta.paradas.length} ubicados: faltan datos para su forma`;
  return `${ubicados} de ${ruta.paradas.length} ubicados`;
}

const TarjetaRuta = memo(function TarjetaRuta({ ruta }: { ruta: Ruta }) {
  const lugares = `${ruta.paradas.length} lugares`;
  const ubicados = textoUbicados(ruta);
  return (
    <Pressable
      accessibilityHint="Abre el mapa y la lista de lugares"
      accessibilityLabel={`Ruta ${ruta.numero}, ${ruta.turno}. ${lugares}. ${ubicados}.`}
      accessibilityRole="button"
      onPress={() => router.push(`/mapa/${ruta.id}`)}
      style={({ pressed }) => [estilos.tarjeta, pressed && estilos.presionada]}
    >
      <View style={estilos.cuerpo}>
        <View style={estilos.nombre}>
          <InsigniaRuta numero={ruta.numero} turno={ruta.turno} />
          <Text style={TEXTO.subtitulo}>Ruta {ruta.numero}</Text>
        </View>
        <EtiquetaTurno turno={ruta.turno} />
        <Text style={TEXTO.fila}>{lugares}</Text>
        <Text style={TEXTO.apoyo}>{ubicados}</Text>
      </View>
      <View style={estilos.lateral}>
        <SiluetaRuta ruta={ruta} />
        <Ionicons color={COLORES.textoSuave} name="chevron-forward" size={20} />
      </View>
    </Pressable>
  );
});

export default function Rutas() {
  const [turno, setTurno] = useState<Turno>('matutino');
  const rutas = useMemo(() => RUTAS.filter((r) => r.turno === turno), [turno]);

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="dark" />
      <View style={estilos.pestanas}>
        <Pestanas onChange={setTurno} opciones={TURNOS} valor={turno} />
      </View>
      <FlatList
        contentContainerStyle={estilos.lista}
        data={rutas}
        keyExtractor={(r) => r.id}
        ListFooterComponent={
          <View style={estilos.pie}>
            <Text style={TEXTO.apoyo}>{AVISO_HORARIOS}</Text>
            <Aviso>{AVISO_NO_OFICIAL}</Aviso>
          </View>
        }
        ListHeaderComponent={
          <View style={estilos.encabezado}>
            <Text style={TEXTO.fila}>{textoHorario(DIAS_CARTEL, turno)}</Text>
            <Text style={TEXTO.apoyo}>{AVISO_SILUETA}</Text>
          </View>
        }
        renderItem={({ item }) => <TarjetaRuta ruta={item} />}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  pestanas: { backgroundColor: COLORES.superficie },
  lista: { padding: 20 },
  encabezado: { gap: 4, paddingBottom: 12, paddingHorizontal: 4 },
  tarjeta: {
    ...TARJETA,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    minHeight: 48,
    padding: 12,
  },
  presionada: { backgroundColor: COLORES.primarioSuave },
  cuerpo: { alignItems: 'flex-start', flex: 1, gap: 4 },
  nombre: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  lateral: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  pie: { gap: 12, paddingHorizontal: 4, paddingTop: 8 },
});
