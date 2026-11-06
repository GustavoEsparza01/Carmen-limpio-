import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  COLORES,
  DIAS_CARTEL,
  RUTAS,
  textoHorario,
  type Turno,
} from '@carmen-limpio/compartido';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Aviso, BarraEstado, FilaNavegable, InsigniaRuta, Pestanas } from '../../componentes/ui';
import { TEXTO } from '../../estilos/tema';

const TURNOS: { id: Turno; texto: string; icono: 'sunny' | 'moon' }[] = [
  { id: 'matutino', texto: 'Matutino', icono: 'sunny' },
  { id: 'vespertino', texto: 'Vespertino', icono: 'moon' },
];

export default function Rutas() {
  const [turno, setTurno] = useState<Turno>('matutino');

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="dark" />
      <Pestanas onChange={setTurno} opciones={TURNOS} valor={turno} />
      <FlatList
        data={RUTAS.filter((r) => r.turno === turno)}
        keyExtractor={(r) => r.id}
        ListFooterComponent={
          <View style={estilos.pie}>
            <Text style={TEXTO.apoyo}>{AVISO_HORARIOS}</Text>
            <Aviso>{AVISO_NO_OFICIAL}</Aviso>
          </View>
        }
        ListHeaderComponent={<Text style={estilos.horario}>{textoHorario(DIAS_CARTEL, turno)}</Text>}
        renderItem={({ item }) => (
          <FilaNavegable
            inicio={<InsigniaRuta numero={item.numero} turno={item.turno} />}
            onPress={() => router.push(`/mapa/${item.id}`)}
            plana
            subtitulo={`${item.paradas.length} lugares`}
            titulo={`Ruta ${item.numero}`}
          />
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.superficie },
  horario: { ...TEXTO.apoyo, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  pie: { gap: 12, padding: 20 },
});
