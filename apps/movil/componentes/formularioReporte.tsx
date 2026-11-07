import {
  AVISO_SIN_MAPA,
  AVISO_SIN_PERMISO_CAMARA,
  buscarLugares,
  COLORES,
  LIMITES_CIUDAD,
  lugarPorId,
  type Coordenadas,
  type Lugar,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Map as Mapa, Marker } from '@maplibre/maplibre-react-native';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMapaDisponible } from '../estado/conexion';
import { borrarFoto, elegirFoto, type OrigenFoto } from '../estado/fotos';
import { ALTURA_TACTIL, RADIO, TEXTO } from '../estilos/tema';
import { ESTILO_MAPA } from './mapaBase';
import { AtribucionOSM, Aviso, Boton, FilaNavegable, IconoCirculo } from './ui';

export function ErrorCampo({ texto }: { texto?: string | undefined }) {
  if (!texto) return null;
  return (
    <View accessibilityLiveRegion="polite" style={estilos.error}>
      <Ionicons color={COLORES.errorTexto} name="alert-circle" size={18} />
      <Text style={estilos.errorTexto}>{texto}</Text>
    </View>
  );
}

export function SelectorLugar({ lugarId, onCambiar }: { lugarId?: string | undefined; onCambiar: (id?: string) => void }) {
  const [consulta, setConsulta] = useState('');
  const resultados = useMemo(() => buscarLugares(consulta).slice(0, 5), [consulta]);
  const elegido = lugarId ? lugarPorId(lugarId) : undefined;

  if (elegido) {
    return (
      <FilaNavegable
        inicio={<IconoCirculo icono="location" />}
        onPress={() => onCambiar(undefined)}
        subtitulo="Toca para cambiarlo"
        titulo={elegido.nombre}
      />
    );
  }

  return (
    <View style={estilos.grupo}>
      <TextInput
        accessibilityLabel="Buscar lugar"
        autoCorrect={false}
        onChangeText={setConsulta}
        placeholder="Busca tu colonia o avenida"
        placeholderTextColor={COLORES.textoSuave}
        style={estilos.campo}
        value={consulta}
      />
      {consulta.trim().length > 0 &&
        resultados.map((lugar: Lugar) => (
          <FilaNavegable
            inicio={<IconoCirculo icono="location" />}
            key={lugar.id}
            onPress={() => onCambiar(lugar.id)}
            titulo={lugar.nombre}
          />
        ))}
    </View>
  );
}

export function SelectorPunto({ punto, onCambiar }: { punto?: Coordenadas | undefined; onCambiar: (p: Coordenadas) => void }) {
  const { disponible } = useMapaDisponible();
  return (
    <View style={estilos.grupo}>
      <View style={estilos.mapa}>
        <Mapa
          attribution={false}
          logo={false}
          mapStyle={ESTILO_MAPA}
          onPress={({ nativeEvent }) => onCambiar(nativeEvent.lngLat as Coordenadas)}
          style={StyleSheet.absoluteFill}
        >
          <Camera bounds={LIMITES_CIUDAD} duration={0} padding={{ bottom: 12, left: 12, right: 12, top: 12 }} />
          {punto && (
            <Marker anchor="bottom" id="punto-reporte" lngLat={punto}>
              <View accessibilityLabel="Punto marcado">
                <Ionicons color={COLORES.errorTexto} name="location" size={38} />
              </View>
            </Marker>
          )}
        </Mapa>
        <View pointerEvents="box-none" style={estilos.atribucion}>
          <AtribucionOSM />
        </View>
      </View>
      <Text style={TEXTO.apoyo}>{punto ? 'Punto marcado. Toca otra parte para moverlo.' : 'Toca el mapa para marcar el punto.'}</Text>
      {!disponible && <Aviso icono="cloud-offline">{AVISO_SIN_MAPA}</Aviso>}
    </View>
  );
}

export function SelectorFoto({ uri, onCambiar }: { uri?: string | undefined; onCambiar: (uri?: string) => void }) {
  const [sinPermiso, setSinPermiso] = useState(false);

  const elegir = async (origen: OrigenFoto) => {
    const resultado = await elegirFoto(origen);
    setSinPermiso('error' in resultado && resultado.error === 'sinPermiso');
    if ('uri' in resultado) {
      if (uri) borrarFoto(uri);
      onCambiar(resultado.uri);
    }
  };

  const quitar = () => {
    if (uri) borrarFoto(uri);
    onCambiar(undefined);
  };

  return (
    <View style={estilos.grupo}>
      {uri && <Image accessibilityLabel="Foto del reporte" source={{ uri }} style={estilos.foto} />}
      <View style={estilos.botones}>
        <View style={estilos.boton}>
          <Boton icono="camera" onPress={() => elegir('camara')} texto="Cámara" variante="secundario" />
        </View>
        <View style={estilos.boton}>
          <Boton icono="images" onPress={() => elegir('galeria')} texto="Galería" variante="secundario" />
        </View>
      </View>
      {uri && (
        <Pressable accessibilityRole="button" onPress={quitar} style={estilos.quitar}>
          <Text style={TEXTO.enlace}>Quitar la foto</Text>
        </Pressable>
      )}
      {sinPermiso && <Aviso icono="camera-reverse">{AVISO_SIN_PERMISO_CAMARA}</Aviso>}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 10 },
  campo: {
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: 1,
    ...TEXTO.campo,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  mapa: { borderRadius: RADIO.grande, height: 280, overflow: 'hidden' },
  atribucion: { left: 8, position: 'absolute', top: 8 },
  foto: { borderRadius: RADIO.grande, height: 200, width: '100%' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  boton: { flexBasis: 130, flexGrow: 1 },
  quitar: { alignItems: 'center', justifyContent: 'center', minHeight: ALTURA_TACTIL },
  error: { alignItems: 'flex-start', flexDirection: 'row', gap: 6 },
  errorTexto: { ...TEXTO.alerta, color: COLORES.errorTexto, flex: 1 },
});
