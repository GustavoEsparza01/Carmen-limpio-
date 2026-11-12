import {
  AVISO_REPORTES,
  COLORES,
  fechaHoraLegible,
  lugarPorId,
  NOMBRE_ESTADO_REPORTE,
  NOMBRE_TIPO_REPORTE,
  type Reporte,
  type TipoReporte,
} from '@carmen-limpio/compartido';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorCampo } from '../../componentes/formularioReporte';
import { Esqueleto } from '../../componentes/movimiento';
import { Aviso, BarraEstado, Boton, FilaNavegable, IconoCirculo, PantallaVacia } from '../../componentes/ui';
import { textoError, useCuenta } from '../../estado/cuenta';
import { ALTURA_TACTIL, CONTENIDO, TEXTO } from '../../estilos/tema';

const TIPOS: { tipo: TipoReporte; icono: 'bus' | 'trash' | 'warning' }[] = [
  { icono: 'bus', tipo: 'noPaso' },
  { icono: 'trash', tipo: 'acumulacion' },
  { icono: 'warning', tipo: 'tiradero' },
];

function descripcionDe(reporte: Reporte) {
  const lugar = reporte.lugarId ? lugarPorId(reporte.lugarId)?.nombre : 'Punto en el mapa';
  return `${lugar ?? 'Lugar'} · ${NOMBRE_ESTADO_REPORTE[reporte.estado]}`;
}

function Cargando() {
  return (
    <View style={estilos.contenido}>
      <Esqueleto alto={72} />
      <Esqueleto alto={64} />
      <Esqueleto alto={64} />
      <Esqueleto alto={64} />
    </View>
  );
}

export default function Reportes() {
  const cuenta = useCuenta();
  const { disponible, cargado, usuario, privacidadVigente, reportes, cargandoReportes, errorReportes, recargar } = cuenta;
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string>();

  // Al volver a la pestaña se ve el estado más reciente: lo cambia el equipo desde el panel.
  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar]),
  );

  if (!disponible) {
    return (
      <PantallaVacia
        icono="document-text"
        texto="Esta versión de la app no está conectada al servidor de reportes. Los horarios siguen disponibles."
        titulo="Reportes no disponibles"
      />
    );
  }

  if (!cargado) return <Cargando />;

  if (!usuario) {
    return (
      <PantallaVacia
        icono="document-text"
        texto="Avisa si el camión no pasó, si hay basura acumulada o un tiradero clandestino, y sigue lo que pasa con tu reporte. Necesitas una cuenta con tu correo; consultar horarios no la necesita."
        titulo="Reportes"
      >
        <View style={estilos.acciones}>
          <Aviso>{AVISO_REPORTES}</Aviso>
          <Boton icono="person-add" onPress={() => router.push('/reportes/privacidad')} texto="Crear cuenta" />
          <Boton
            icono="log-in"
            onPress={() => router.push('/reportes/cuenta?modo=entrar')}
            texto="Ya tengo cuenta"
            variante="secundario"
          />
        </View>
      </PantallaVacia>
    );
  }

  const confirmarEliminacion = () =>
    Alert.alert(
      'Eliminar mi cuenta',
      'Se borrarán tu cuenta, tus reportes y sus fotos. No se puede deshacer.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: async () => {
            setEliminando(true);
            setError(undefined);
            try {
              await cuenta.eliminarCuenta();
            } catch (e) {
              setError(textoError(e));
            } finally {
              setEliminando(false);
            }
          },
          style: 'destructive',
          text: 'Eliminar',
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl colors={[COLORES.primario]} onRefresh={recargar} refreshing={cargandoReportes && reportes.length > 0} />
      }
    >
      <BarraEstado estilo="dark" />
      <Aviso>{AVISO_REPORTES}</Aviso>

      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        Nuevo reporte
      </Text>
      {privacidadVigente === false ? (
        <View style={estilos.acciones}>
          <Text style={TEXTO.cuerpo}>Para reportar, primero lee y acepta el aviso de privacidad.</Text>
          <Boton icono="document-text" onPress={() => router.push('/reportes/privacidad')} texto="Leer el aviso" />
        </View>
      ) : (
        TIPOS.map(({ tipo, icono }) => (
          <FilaNavegable
            inicio={<IconoCirculo icono={icono} />}
            key={tipo}
            onPress={() => router.push(`/reportes/nuevo?tipo=${tipo}`)}
            titulo={NOMBRE_TIPO_REPORTE[tipo]}
          />
        ))
      )}

      <Text accessibilityRole="header" style={TEXTO.subtitulo}>
        Mis reportes
      </Text>
      {cargandoReportes && reportes.length === 0 && <Esqueleto alto={64} />}
      {errorReportes && <Text style={TEXTO.cuerpo}>No pudimos cargar tus reportes. Desliza hacia abajo para reintentar.</Text>}
      {!cargandoReportes && !errorReportes && reportes.length === 0 && (
        <Text style={TEXTO.cuerpo}>Aún no tienes reportes.</Text>
      )}
      {reportes.map((reporte) => (
        <FilaNavegable
          detalle={<Text style={TEXTO.apoyo}>{fechaHoraLegible(reporte.creado)}</Text>}
          key={reporte.id}
          onPress={() => router.push(`/reportes/${reporte.id}`)}
          subtitulo={descripcionDe(reporte)}
          titulo={NOMBRE_TIPO_REPORTE[reporte.tipo]}
        />
      ))}

      <View style={estilos.pie}>
        <Text style={TEXTO.apoyo}>{usuario.correo}</Text>
        <ErrorCampo texto={error} />
        <View style={estilos.enlaces}>
          <Pressable accessibilityRole="button" onPress={() => cuenta.salir()} style={estilos.enlace}>
            <Text style={TEXTO.enlace}>Cerrar sesión</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={eliminando}
            onPress={confirmarEliminacion}
            style={estilos.enlace}
          >
            <Text style={TEXTO.enlace}>{eliminando ? 'Eliminando…' : 'Eliminar mi cuenta'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  acciones: { gap: 12 },
  pie: { gap: 4, paddingTop: 12 },
  enlaces: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  enlace: { justifyContent: 'center', minHeight: ALTURA_TACTIL },
});
