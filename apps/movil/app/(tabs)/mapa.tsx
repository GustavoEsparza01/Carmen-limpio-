import {
  AVISO_SIN_MAPA,
  COLORES,
  colorDeRuta,
  DIAS_CARTEL,
  LIMITES_CIUDAD,
  rutaPorId,
  rutasDeTurno,
  rutasTocadas,
  textoHorario,
  TRAZADOS_CIUDAD,
  type PropiedadesTrazado,
  type Ruta,
  type Turno,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map as Mapa, type CameraRef } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ESTILO_MAPA } from '../../componentes/mapaBase';
import {
  AtribucionOSM,
  Aviso,
  BarraEstado,
  Boton,
  EtiquetaIlustrativa,
  EtiquetaTurno,
  InsigniaRuta,
  Pastilla,
  PastillaRuta,
} from '../../componentes/ui';
import { useMapaDisponible } from '../../estado/conexion';
import { RADIO, SOMBRA, TARJETA, TEXTO } from '../../estilos/tema';

const TURNOS: { id: Turno | null; texto: string }[] = [
  { id: null, texto: 'Todas' },
  { id: 'matutino', texto: 'Matutino' },
  { id: 'vespertino', texto: 'Vespertino' },
];

// Con letra grande la tarjeta no debe tapar el mapa ni los filtros.
const ALTURA_MAXIMA_TARJETA = 0.42;
const MARGEN_MAPA = { top: 210, right: 30, bottom: 190, left: 30 };

function Leyenda() {
  return (
    <View style={estilos.tarjeta}>
      <Text style={TEXTO.fila}>Toca una línea para ver su ruta</Text>
      <View accessibilityLabel="Línea continua: matutino. Línea punteada: vespertino." accessible style={estilos.leyenda}>
        <View style={estilos.leyendaFila}>
          <View style={estilos.muestraContinua} />
          <Text style={TEXTO.apoyo}>Matutino</Text>
        </View>
        <View style={estilos.leyendaFila}>
          <View style={estilos.muestraPunteada} />
          <Text style={TEXTO.apoyo}>Vespertino</Text>
        </View>
      </View>
    </View>
  );
}

function TarjetaRuta({
  ruta,
  otras,
  onElegir,
  onCerrar,
}: {
  ruta: Ruta;
  otras: Ruta[];
  onElegir: (id: string) => void;
  onCerrar: () => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <View style={[estilos.tarjeta, { maxHeight: height * ALTURA_MAXIMA_TARJETA }]}>
      <View style={estilos.tarjetaTitulo}>
        <InsigniaRuta numero={ruta.numero} turno={ruta.turno} />
        <View style={estilos.tarjetaTexto}>
          <View style={estilos.tarjetaNombre}>
            <Text accessibilityRole="header" style={TEXTO.subtitulo}>
              Ruta {ruta.numero}
            </Text>
            <EtiquetaTurno turno={ruta.turno} />
          </View>
          <Text style={TEXTO.apoyo}>{ruta.paradas.length} lugares</Text>
        </View>
        <Pressable accessibilityLabel="Cerrar la tarjeta" accessibilityRole="button" hitSlop={14} onPress={onCerrar}>
          <Ionicons color={COLORES.textoSuave} name="close" size={24} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={estilos.tarjetaDetalle} style={estilos.tarjetaDesplazable}>
        <Text style={TEXTO.apoyo}>{textoHorario(DIAS_CARTEL, ruta.turno)}. Algunos lugares tienen otros días.</Text>
        {otras.length > 0 && (
          <View style={estilos.otras}>
          <Text style={TEXTO.apoyo}>También aquí:</Text>
          <ScrollView contentContainerStyle={estilos.filaOtras} horizontal showsHorizontalScrollIndicator={false}>
            {otras.map((r) => (
              <PastillaRuta
                activa={false}
                color={colorDeRuta(r.numero)}
                key={r.id}
                numero={r.numero}
                onPress={() => onElegir(r.id)}
                turno={r.turno}
              />
            ))}
          </ScrollView>
          </View>
        )}
      </ScrollView>
      <Boton icono="map" onPress={() => router.push(`/mapa/${ruta.id}`)} texto="Ver esta ruta" />
    </View>
  );
}

export default function MapaCiudad() {
  const { top } = useSafeAreaInsets();
  const { disponible, comprobar } = useMapaDisponible();
  const camara = useRef<CameraRef>(null);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [soloRuta, setSoloRuta] = useState<string | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [tocadas, setTocadas] = useState<string[]>([]);

  const rutas = useMemo(() => rutasDeTurno(turno), [turno]);
  const visibles = soloRuta ? [soloRuta] : rutas.map((r) => r.id);
  const ruta = elegida ? rutaPorId(elegida) : undefined;
  const otras = tocadas.flatMap((id) => {
    const otra = id === elegida ? undefined : rutaPorId(id);
    return otra ? [otra] : [];
  });

  const limpiar = () => {
    setSoloRuta(null);
    setElegida(null);
    setTocadas([]);
  };

  const elegirTurno = (id: Turno | null) => {
    limpiar();
    setTurno(id);
  };

  const filtrarRuta = (id: string) => {
    const quitar = soloRuta === id;
    setSoloRuta(quitar ? null : id);
    setElegida(quitar ? null : id);
    setTocadas([]);
  };

  const filtro = (delTurno: Turno) =>
    ['all', ['==', ['get', 'turno'], delTurno], ['in', ['get', 'rutaId'], ['literal', visibles]]] as never;
  const siElegida = ['==', ['get', 'rutaId'], elegida ?? ''] as never;
  const trazo = {
    'line-color': ['get', 'color'],
    'line-opacity': elegida ? ['case', siElegida, 1, 0.3] : 0.9,
    'line-width': ['case', siElegida, 7, 4],
  } as never;

  return (
    <View style={estilos.pantalla}>
      <BarraEstado estilo="dark" />
      <Mapa
        attribution={false}
        logo={false}
        mapStyle={ESTILO_MAPA}
        onPress={limpiar}
        style={StyleSheet.absoluteFill}
      >
        <Camera bounds={LIMITES_CIUDAD} duration={0} padding={MARGEN_MAPA} ref={camara} />
        <GeoJSONSource
          data={TRAZADOS_CIUDAD as GeoJSON.FeatureCollection}
          id="ciudad"
          onPress={(evento) => {
            evento.stopPropagation();
            const ids = rutasTocadas(
              evento.nativeEvent.features.map((f) => f.properties as Partial<PropiedadesTrazado> | null),
            );
            setElegida(ids[0] ?? null);
            setTocadas(ids);
          }}
        >
          <Layer
            filter={['in', ['get', 'rutaId'], ['literal', visibles]] as never}
            id="ciudad-borde"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORES.superficie, 'line-opacity': 0.85, 'line-width': 7 }}
            type="line"
          />
          <Layer
            filter={filtro('matutino')}
            id="ciudad-matutino"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={trazo}
            type="line"
          />
          <Layer
            filter={filtro('vespertino')}
            id="ciudad-vespertino"
            layout={{ 'line-join': 'round' }}
            paint={{ ...(trazo as object), 'line-dasharray': [2, 1.2] }}
            type="line"
          />
        </GeoJSONSource>
      </Mapa>

      <View pointerEvents="box-none" style={[estilos.superior, { top: top + 8 }]}>
        <View pointerEvents="box-none" style={estilos.etiquetas}>
          <EtiquetaIlustrativa />
          <AtribucionOSM />
        </View>
        <ScrollView contentContainerStyle={estilos.filaPastillas} horizontal showsHorizontalScrollIndicator={false}>
          {TURNOS.map((t) => (
            <Pastilla activa={turno === t.id} key={t.texto} onPress={() => elegirTurno(t.id)} texto={t.texto} />
          ))}
        </ScrollView>
        <ScrollView contentContainerStyle={estilos.filaPastillas} horizontal showsHorizontalScrollIndicator={false}>
          {rutas.map((r) => (
            <PastillaRuta
              activa={soloRuta === r.id}
              color={colorDeRuta(r.numero)}
              key={r.id}
              numero={r.numero}
              onPress={() => filtrarRuta(r.id)}
              turno={r.turno}
            />
          ))}
        </ScrollView>
        {!disponible && (
          <View style={estilos.sinMapa}>
            <Aviso icono="cloud-offline">{AVISO_SIN_MAPA}</Aviso>
            <View style={estilos.sinMapaAcciones}>
              <Boton icono="time" onPress={() => router.push('/rutas')} texto="Ver horarios" />
              <Boton icono="refresh" onPress={comprobar} texto="Reintentar" variante="secundario" />
            </View>
          </View>
        )}
      </View>

      <View pointerEvents="box-none" style={estilos.inferior}>
        {ruta ? (
          <TarjetaRuta onCerrar={limpiar} onElegir={setElegida} otras={otras} ruta={ruta} />
        ) : (
          <Leyenda />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORES.fondo },
  superior: { gap: 8, left: 0, position: 'absolute', right: 0 },
  etiquetas: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  filaPastillas: { gap: 8, paddingHorizontal: 16 },
  sinMapa: { ...TARJETA, gap: 10, marginHorizontal: 16, padding: 12 },
  sinMapaAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inferior: { bottom: 12, left: 16, position: 'absolute', right: 16 },
  tarjeta: { ...SOMBRA, backgroundColor: COLORES.superficie, borderRadius: RADIO.grande, elevation: 6, gap: 10, padding: 14 },
  tarjetaTitulo: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  tarjetaTexto: { flex: 1 },
  tarjetaDesplazable: { flexShrink: 1 },
  tarjetaDetalle: { gap: 10 },
  tarjetaNombre: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  otras: { gap: 6 },
  filaOtras: { gap: 8 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  leyendaFila: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  muestraContinua: { backgroundColor: COLORES.texto, borderRadius: RADIO.completo, height: 4, width: 32 },
  muestraPunteada: { borderColor: COLORES.texto, borderStyle: 'dashed', borderTopWidth: 3, height: 0, width: 32 },
});
