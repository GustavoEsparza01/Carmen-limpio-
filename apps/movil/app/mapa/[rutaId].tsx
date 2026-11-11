import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_POR_CONFIRMAR,
  AVISO_SIMULACION,
  AVISO_TRAZADO,
  COLORES,
  DIAS_CARTEL,
  diasDeRuta,
  etiquetaRuta,
  limitesDe,
  lugaresUbicados,
  NOMBRE_DIA,
  notaExcepcion,
  paradasDeLugar,
  paradasDelDia,
  rutaPorId,
  textoHorario,
  trazadoDeRuta,
  VENTANAS,
  type Dia,
  type ParadaDeRuta,
  type Turno,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map as Mapa, type CameraRef } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtribucionOSM,
  Aviso,
  BarraEstado,
  BotonFlotante,
  DiasSemana,
  EtiquetaIlustrativa,
  EtiquetaTurno,
  InsigniaRuta,
  Pastilla,
  Pestanas,
} from '../../componentes/ui';
import { CamionRemoto, CamionSimulado } from '../../componentes/CamionSimulado';
import { ESTILO_MAPA } from '../../componentes/mapaBase';
import { useCamionSimulado, type EstadoCamion } from '../../estado/camion';
import { ALTURA_TACTIL, RADIO, SOMBRA, TEXTO } from '../../estilos/tema';

type Pestana = 'lugares' | 'horario';

// Qué decir mientras el camión simulado está activo. Nunca sugiere una hora de llegada.
function textoSimulacion(camion: EstadoCamion, turno: Turno | undefined): string {
  switch (camion.tipo) {
    case 'buscando':
      return 'Buscando el camión simulado…';
    case 'sinConexion':
      return 'Sin conexión no se puede mostrar el camión simulado.';
    case 'fueraDeServicio': {
      const ventana = turno ? ` (${VENTANAS[turno].inicio} a ${VENTANAS[turno].fin})` : '';
      return `El camión simulado solo recorre esta ruta en su ventana${ventana} los días con recolección. ${AVISO_SIMULACION}`;
    }
    default:
      return AVISO_SIMULACION;
  }
}

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'lugares', texto: 'Lugares' },
  { id: 'horario', texto: 'Horario' },
];

const ALTURA_CABECERA = 134;
const ZOOM_LUGAR = 15;

function FilaParada({
  parada,
  elegida,
  onPress,
}: {
  parada: ParadaDeRuta;
  elegida: boolean;
  onPress: () => void;
}) {
  const { lugar, horario } = parada;
  const ubicado = horario.confianza !== 'ninguna';
  const excepcion = notaExcepcion(horario.dias);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      onPress={onPress}
      style={[estilos.parada, elegida && estilos.paradaElegida]}
    >
      <Ionicons
        color={ubicado ? COLORES.primario : COLORES.inactivoTexto}
        name={ubicado ? 'location' : 'location-outline'}
        size={20}
      />
      <View style={estilos.paradaCuerpo}>
        <Text style={TEXTO.fila}>{lugar.nombre}</Text>
        {!ubicado && <Text style={TEXTO.apoyo}>Sin ubicar en el mapa</Text>}
        {elegida && <Text style={TEXTO.apoyo}>{textoHorario(horario.dias, horario.turno)}</Text>}
        {excepcion && !elegida && <Text style={estilos.excepcion}>{excepcion}</Text>}
        {horario.porConfirmar && <Text style={estilos.excepcion}>{AVISO_POR_CONFIRMAR}</Text>}
      </View>
      {elegida && <Ionicons color={COLORES.textoSuave} name="chevron-forward" size={20} style={estilos.paradaFlecha} />}
    </Pressable>
  );
}

export default function MapaRuta() {
  const { rutaId, lugar } = useLocalSearchParams<{ rutaId: string; lugar?: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [elegido, setElegido] = useState(lugar);
  const [pestana, setPestana] = useState<Pestana>('lugares');
  const [dia, setDia] = useState<Dia | null>(null);
  const [simulando, setSimulando] = useState(false);
  const camion = useCamionSimulado(rutaId, simulando);
  const ruta = rutaPorId(rutaId);
  const trazado = trazadoDeRuta(rutaId);
  const camara = useRef<CameraRef>(null);
  const lista = useRef<FlatList<ParadaDeRuta>>(null);

  const alturaCerrado = ALTURA_CABECERA + bottom;
  const alturaAbierto = Math.round(height * 0.84);
  const alturaMedio = Math.round(height * 0.48);
  const paradas = [alturaAbierto - alturaMedio, alturaAbierto - alturaCerrado, 0];
  const desplazamiento = useRef(new Animated.Value(alturaAbierto - alturaMedio)).current;
  const posicion = useRef(alturaAbierto - alturaMedio);
  const [espacioLista, setEspacioLista] = useState(alturaAbierto - alturaMedio);

  const moverA = (destino: number) => {
    posicion.current = destino;
    setEspacioLista(destino);
    Animated.spring(desplazamiento, {
      bounciness: 0,
      speed: 18,
      toValue: destino,
      useNativeDriver: true,
    }).start();
  };

  const arrastre = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderMove: (_, { dy }) => {
        const siguiente = Math.max(0, Math.min(alturaAbierto - alturaCerrado, posicion.current + dy));
        desplazamiento.setValue(siguiente);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const proyectado = posicion.current + dy + vy * 180;
        const destino = paradas.reduce((cercano, p) =>
          Math.abs(p - proyectado) < Math.abs(cercano - proyectado) ? p : cercano,
        );
        moverA(destino);
      },
    }),
  ).current;

  const limites = useMemo(() => trazado && limitesDe(trazado), [trazado]);
  const margenMapa = useMemo(
    () => ({ top: top + 90, right: 40, bottom: alturaMedio + 30, left: 40 }),
    [top, alturaMedio],
  );

  const linea = useMemo<GeoJSON.Feature | undefined>(
    () =>
      trazado && {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: trazado.linea },
      },
    [trazado],
  );

  const delDia = useMemo(() => (ruta ? paradasDelDia(ruta, dia) : []), [ruta, dia]);

  const puntos = useMemo<GeoJSON.FeatureCollection>(() => {
    const visibles = new Set(delDia.map((p) => p.lugar.id));
    return {
      type: 'FeatureCollection',
      features: (trazado?.paradas ?? [])
        .filter((p) => p.lugarIds.some((id) => visibles.has(id)))
        .map((p) => ({
          type: 'Feature',
          properties: {
            lugarId: p.lugarIds.find((id) => visibles.has(id)),
            elegido: elegido !== undefined && p.lugarIds.includes(elegido),
          },
          geometry: { type: 'Point', coordinates: p.coordenadas },
        })),
    };
  }, [trazado, delDia, elegido]);

  if (!ruta || !trazado || !linea || !limites) {
    return <Text style={[TEXTO.cuerpo, estilos.vacio]}>No encontramos esta ruta.</Text>;
  }

  const lugarIds = elegido ? (paradasDeLugar(trazado, elegido)[0]?.lugarIds ?? []) : [];
  const paradasEnLista = [
    ...delDia.filter((p) => lugarIds.includes(p.lugar.id)),
    ...delDia.filter((p) => !lugarIds.includes(p.lugar.id)),
  ];

  const elegir = (parada: ParadaDeRuta) => {
    const [punto] = paradasDeLugar(trazado, parada.lugar.id);
    if (!punto || lugarIds.includes(parada.lugar.id)) {
      router.push(`/lugar/${parada.lugar.id}`);
      return;
    }
    setElegido(parada.lugar.id);
    lista.current?.scrollToOffset({ offset: 0, animated: true });
    camara.current?.easeTo({ center: punto.coordenadas, zoom: ZOOM_LUGAR, padding: margenMapa, duration: 500 });
  };

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="dark" />
      <Mapa attribution={false} logo={false} mapStyle={ESTILO_MAPA} style={StyleSheet.absoluteFill}>
        <Camera bounds={limites} duration={0} padding={margenMapa} ref={camara} />
        <GeoJSONSource data={linea} id="linea">
          <Layer
            id="linea-ruta"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORES.primario, 'line-opacity': 0.8, 'line-width': 5 }}
            type="line"
          />
        </GeoJSONSource>
        <GeoJSONSource
          data={puntos}
          id="puntos"
          onPress={({ nativeEvent }) => setElegido(nativeEvent.features[0]?.properties?.lugarId)}
        >
          <Layer
            id="puntos-ruta"
            layout={{ 'circle-sort-key': ['case', ['get', 'elegido'], 1, 0] }}
            paint={{
              'circle-color': ['case', ['get', 'elegido'], COLORES.acentoTexto, COLORES.superficie],
              'circle-radius': ['case', ['get', 'elegido'], 10, 7],
              'circle-stroke-color': COLORES.primario,
              'circle-stroke-width': 3,
            }}
            type="circle"
          />
        </GeoJSONSource>
        {simulando && camion.tipo === 'local' && <CamionSimulado linea={trazado.linea} />}
        {simulando && camion.tipo === 'enServicio' && <CamionRemoto punto={camion.punto} />}
      </Mapa>

      <View pointerEvents="box-none" style={[estilos.superior, { top: top + 8 }]}>
        <BotonFlotante etiqueta="Regresar" icono="arrow-back" onPress={() => router.back()} />
        <EtiquetaIlustrativa />
        <View style={estilos.equilibrio} />
      </View>

      <View style={[estilos.recentrar, { top: top + 66 }]}>
        <BotonFlotante
          etiqueta="Ver toda la ruta"
          icono="scan"
          onPress={() => camara.current?.fitBounds(limites, { padding: margenMapa, duration: 500 })}
        />
        <BotonFlotante
          etiqueta={simulando ? 'Detener simulación' : 'Simular camión'}
          icono={simulando ? 'stop' : 'play'}
          onPress={() => setSimulando((activo) => !activo)}
        />
      </View>

      {simulando && (
        <View style={[estilos.simulacion, { top: top + 96 }]}>
          <Ionicons color={COLORES.acentoTexto} name="information-circle" size={16} />
          <Text style={estilos.simulacionTexto}>{textoSimulacion(camion, ruta?.turno)}</Text>
        </View>
      )}

      <View style={[estilos.atribucion, { top: top + 62 }]}>
        <AtribucionOSM />
      </View>

      <Animated.View
        style={[estilos.panel, { height: alturaAbierto, transform: [{ translateY: desplazamiento }] }]}
      >
        <View {...arrastre.panHandlers} style={estilos.panelCabecera}>
          <Pressable
            accessibilityLabel="Cambiar el tamaño del panel"
            accessibilityRole="button"
            onPress={() => moverA(posicion.current === 0 ? paradas[0]! : 0)}
            hitSlop={{ bottom: 10, top: 10 }}
            style={estilos.asa}
          >
            <View style={estilos.asaLinea} />
          </Pressable>
          <View style={estilos.titulo}>
            <InsigniaRuta numero={ruta.numero} turno={ruta.turno} />
            <View style={estilos.tituloTexto}>
              <View style={estilos.tituloFila}>
                <Text accessibilityRole="header" style={TEXTO.subtitulo}>
                  Ruta {ruta.numero}
                </Text>
                <EtiquetaTurno turno={ruta.turno} />
              </View>
              <Text style={TEXTO.apoyo}>
                {lugaresUbicados(trazado)} de {ruta.paradas.length} lugares ubicados
              </Text>
            </View>
          </View>
        </View>

        <Pestanas onChange={setPestana} opciones={PESTANAS} valor={pestana} />

        {pestana === 'lugares' ? (
          <FlatList
            contentContainerStyle={{ paddingBottom: espacioLista + bottom + 16 }}
            data={paradasEnLista}
            keyExtractor={(p) => p.lugar.id}
            ListHeaderComponent={
              <ScrollView contentContainerStyle={estilos.dias} horizontal showsHorizontalScrollIndicator={false}>
                <Pastilla activa={dia === null} onPress={() => setDia(null)} texto="Todos" />
                {diasDeRuta(ruta).map((d) => (
                  <Pastilla activa={dia === d} key={d} onPress={() => setDia(d)} texto={NOMBRE_DIA[d].replace(/^./, (letra) => letra.toUpperCase())} />
                ))}
              </ScrollView>
            }
            ref={lista}
            renderItem={({ item }) => (
              <FilaParada
                elegida={lugarIds.includes(item.lugar.id)}
                onPress={() => elegir(item)}
                parada={item}
              />
            )}
          />
        ) : (
          <ScrollView contentContainerStyle={[estilos.horario, { paddingBottom: espacioLista + bottom + 16 }]}>
            <Text style={TEXTO.fila}>{etiquetaRuta(ruta)}</Text>
            <DiasSemana dias={DIAS_CARTEL} />
            <Text style={estilos.ventana}>{textoHorario(DIAS_CARTEL, ruta.turno)}</Text>
            <Aviso icono="map">{AVISO_TRAZADO}</Aviso>
            <Text style={TEXTO.apoyo}>{AVISO_HORARIOS}</Text>
            <Aviso>{AVISO_NO_OFICIAL}</Aviso>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  superior: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
  },
  equilibrio: { width: ALTURA_TACTIL },
  recentrar: { gap: 10, position: 'absolute', right: 16 },
  simulacion: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.chico,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    right: 74,
  },
  simulacionTexto: { ...TEXTO.pequeno, color: COLORES.acentoTexto, flex: 1 },
  atribucion: { left: 16, position: 'absolute' },
  panel: {
    ...SOMBRA,
    backgroundColor: COLORES.superficie,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    elevation: 12,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
  },
  panelCabecera: { paddingBottom: 10, paddingHorizontal: 20 },
  asa: { alignItems: 'center', height: 28, justifyContent: 'center' },
  asaLinea: { backgroundColor: COLORES.borde, borderRadius: RADIO.completo, height: 5, width: 44 },
  titulo: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  tituloTexto: { flex: 1 },
  tituloFila: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dias: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  parada: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORES.borde,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  paradaElegida: { backgroundColor: COLORES.primarioSuave },
  paradaCuerpo: { flex: 1, gap: 2 },
  paradaFlecha: { alignSelf: 'center' },
  excepcion: TEXTO.alerta,
  horario: { gap: 14, padding: 20 },
  ventana: TEXTO.destacado,
  vacio: { padding: 20 },
});
