import {
  AVISO_NO_OFICIAL_CORTO,
  buscarLugares,
  COLORES,
  DIAS_CARTEL,
  lugarPorId,
  RUTAS,
  textoHorario,
  type Lugar,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascota } from '../componentes/Mascota';
import { TarjetaHoy } from '../componentes/TarjetaHoy';
import {
  BarraEstado,
  Boton,
  DiasSemana,
  EtiquetaTurno,
  FilaNavegable,
  IconoCirculo,
  TarjetaAcceso,
} from '../componentes/ui';
import { useAhora } from '../estado/ahora';
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

function Invitacion({ onElegir }: { onElegir: () => void }) {
  return (
    <View style={estilos.invitacion}>
      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        ¿Hoy toca recolección en tu colonia?
      </Text>
      <Text style={TEXTO.cuerpo}>Elige tu colonia y aquí verás cada día si toca y en qué ventana.</Text>
      <Boton icono="location" onPress={onElegir} texto="Elegir mi colonia" />
    </View>
  );
}

function HorarioGeneral() {
  return (
    <View style={estilos.general}>
      <Text style={TEXTO.seccion}>Días generales de los carteles</Text>
      <DiasSemana dias={DIAS_CARTEL} />
      <View style={estilos.generalTurnos}>
        <EtiquetaTurno conHorario turno="matutino" />
        <EtiquetaTurno conHorario turno="vespertino" />
      </View>
      <Text style={TEXTO.apoyo}>Algunos lugares tienen otros días: elige el tuyo para verlos.</Text>
    </View>
  );
}

export default function Inicio() {
  const { top, bottom } = useSafeAreaInsets();
  const { favoritaId } = useFavorita();
  const ahora = useAhora();
  const buscador = useRef<ComponentRef<typeof TextInput>>(null);
  const [consulta, setConsulta] = useState('');
  const resultados = useMemo(() => buscarLugares(consulta), [consulta]);
  const buscando = consulta.trim().length > 0;
  const favorita = favoritaId ? lugarPorId(favoritaId) : undefined;

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="light" />
      <View style={[estilos.barraSuperior, { height: top }]} />
      <ScrollView keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]} style={estilos.desplazable}>
        <View style={estilos.encabezado}>
          <View style={estilos.marcaTexto}>
            <Text accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1} style={estilos.titulo}>
              Carmen Limpio
            </Text>
            {!buscando && <Text style={estilos.subtitulo}>¿Qué días pasa el camión por tu colonia?</Text>}
          </View>
          <Mascota tamano={buscando ? 44 : 64} />
        </View>

        <View style={estilos.buscadorFijo}>
          <View style={estilos.buscador}>
            <Ionicons color={COLORES.textoSuave} name="search" size={22} />
            <TextInput
              accessibilityLabel="Buscar colonia, fraccionamiento o avenida"
              autoCorrect={false}
              onChangeText={setConsulta}
              placeholder="Busca tu colonia"
              placeholderTextColor={COLORES.textoSuave}
              ref={buscador}
              returnKeyType="search"
              style={estilos.buscadorCampo}
              value={consulta}
            />
            {buscando && (
              <Pressable
                accessibilityLabel="Borrar búsqueda"
                accessibilityRole="button"
                hitSlop={14}
                onPress={() => setConsulta('')}
              >
                <Ionicons color={COLORES.textoSuave} name="close-circle" size={22} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={estilos.contenido}>
          {buscando ? (
            <>
              {resultados.map((lugar) => (
                <FilaNavegable
                  inicio={<IconoCirculo icono="location" />}
                  key={lugar.id}
                  onPress={() => abrir(lugar)}
                  subtitulo={resumen(lugar)}
                  titulo={lugar.nombre}
                />
              ))}
              {resultados.length === 0 && (
                <View style={estilos.vacio}>
                  <IconoCirculo icono="search" />
                  <Text style={estilos.vacioTexto}>
                    No encontramos ese lugar. Prueba con solo una parte del nombre. Es posible que no aparezca en los
                    carteles.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {favorita ? (
                <TarjetaHoy ahora={ahora} lugar={favorita} />
              ) : (
                <>
                  <Invitacion onElegir={() => buscador.current?.focus()} />
                  <HorarioGeneral />
                </>
              )}
              <View style={estilos.accesos}>
                <TarjetaAcceso
                  icono="bus"
                  onPress={() => router.push('/rutas')}
                  subtitulo={`${RUTAS.length} rutas en dos turnos`}
                  titulo="Rutas"
                />
                <TarjetaAcceso icono="map" subtitulo="Próximamente" titulo="Mapa de la ciudad" />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: bottom + 8 }]}>
        <Ionicons color={COLORES.textoSuave} name="information-circle-outline" size={16} />
        <Text style={estilos.pieTexto}>{AVISO_NO_OFICIAL_CORTO}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  barraSuperior: { backgroundColor: COLORES.primario },
  desplazable: { flex: 1 },
  encabezado: {
    alignItems: 'center',
    backgroundColor: COLORES.primario,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 44,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  marcaTexto: { flex: 1 },
  titulo: { color: COLORES.superficie, fontFamily: FUENTE, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  subtitulo: {
    color: COLORES.primarioSuave,
    fontFamily: FUENTE,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 2,
  },
  buscadorFijo: { marginTop: -30, paddingHorizontal: 20 },
  buscador: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.grande,
    elevation: 4,
    flexDirection: 'row',
    gap: 10,
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
  invitacion: { ...TARJETA, gap: 10, padding: 18 },
  general: { ...TARJETA, gap: 12, padding: 16 },
  generalTurnos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vacio: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 4 },
  vacioTexto: { ...TEXTO.cuerpo, flex: 1 },
  pie: {
    alignItems: 'flex-start',
    backgroundColor: COLORES.fondo,
    borderColor: COLORES.borde,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pieTexto: { ...TEXTO.apoyo, flex: 1, fontSize: 13, lineHeight: 18 },
});
