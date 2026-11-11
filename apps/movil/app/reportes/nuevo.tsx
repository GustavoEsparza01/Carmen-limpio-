import {
  AVISO_REPORTES,
  COLORES,
  etiquetaFecha,
  fechasConRecoleccion,
  LARGO_MAXIMO_DESCRIPCION,
  NOMBRE_TIPO_REPORTE,
  TEXTO_PRIVACIDAD_FOTOS,
  validarReporte,
  type BorradorReporte,
  type TipoReporte,
} from '@carmen-limpio/compartido';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorCampo, SelectorFoto, SelectorLugar, SelectorPunto } from '../../componentes/formularioReporte';
import { Aviso, BarraEstado, Boton, Pastilla } from '../../componentes/ui';
import { textoError, useCuenta } from '../../estado/cuenta';
import { CONTENIDO, RADIO, TEXTO } from '../../estilos/tema';

function esTipo(valor: string | undefined): valor is TipoReporte {
  return valor === 'noPaso' || valor === 'acumulacion' || valor === 'tiradero';
}

export default function NuevoReporte() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const { crear } = useCuenta();
  const [ahora] = useState(() => new Date());
  const [borrador, setBorrador] = useState<Partial<BorradorReporte>>({});
  const [revisar, setRevisar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  if (!esTipo(tipo)) return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No reconocemos este tipo de reporte.</Text>;

  const datos: BorradorReporte = { ...borrador, tipo };
  const errores = validarReporte(datos, ahora);
  const mostrados = revisar ? errores : {};
  const fechas = fechasConRecoleccion(borrador.lugarId, ahora);
  const cambiar = (campos: Partial<BorradorReporte>) => setBorrador((actual) => ({ ...actual, ...campos }));

  const guardar = async () => {
    setRevisar(true);
    if (Object.keys(errores).length > 0 || guardando) return;
    setGuardando(true);
    setError(undefined);
    try {
      const id = await crear(datos);
      router.replace(`/reportes/${id}`);
    } catch (e) {
      setError(textoError(e));
      setGuardando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <BarraEstado estilo="dark" />
      <Stack.Screen options={{ title: NOMBRE_TIPO_REPORTE[tipo] }} />
      <Aviso>{AVISO_REPORTES}</Aviso>

      {tipo !== 'tiradero' && (
        <View style={estilos.campo}>
          <Text style={TEXTO.fila}>{tipo === 'noPaso' ? 'Colonia o lugar' : 'Ubicación'}</Text>
          <SelectorLugar
            lugarId={borrador.lugarId}
            // Otro lugar tiene otros días: la fecha elegida deja de valer.
            onCambiar={(lugarId) => cambiar(tipo === 'noPaso' ? { lugarId, fecha: undefined } : { lugarId })}
          />
          <ErrorCampo texto={mostrados.lugarId} />
        </View>
      )}

      {tipo === 'noPaso' && (
        <View style={estilos.campo}>
          <Text style={TEXTO.fila}>Fecha</Text>
          {!borrador.lugarId ? (
            <Text style={TEXTO.apoyo}>Elige primero el lugar para ver sus días de recolección.</Text>
          ) : fechas.length === 0 ? (
            <Text style={TEXTO.apoyo}>En los últimos 7 días no hubo recolección en este lugar, según el cartel.</Text>
          ) : (
            <>
              <View style={estilos.fechas}>
                {fechas.map((fecha) => (
                  <Pastilla
                    activa={borrador.fecha === fecha}
                    key={fecha}
                    onPress={() => cambiar({ fecha })}
                    texto={etiquetaFecha(fecha, ahora)}
                  />
                ))}
              </View>
              <Text style={TEXTO.apoyo}>Solo aparecen los días con recolección en este lugar.</Text>
            </>
          )}
          <ErrorCampo texto={mostrados.fecha} />
        </View>
      )}

      {tipo === 'tiradero' && (
        <View style={estilos.campo}>
          <Text style={TEXTO.fila}>Punto en el mapa</Text>
          <SelectorPunto onCambiar={(punto) => cambiar({ punto })} punto={borrador.punto} />
          <ErrorCampo texto={mostrados.punto} />
        </View>
      )}

      {tipo !== 'noPaso' && (
        <>
          <View style={estilos.campo}>
            <Text style={TEXTO.fila}>Descripción</Text>
            <TextInput
              accessibilityLabel="Descripción"
              maxLength={LARGO_MAXIMO_DESCRIPCION}
              multiline
              onChangeText={(descripcion) => cambiar({ descripcion })}
              placeholder="Cuéntanos qué ves"
              placeholderTextColor={COLORES.textoSuave}
              style={estilos.descripcion}
              textAlignVertical="top"
              value={borrador.descripcion ?? ''}
            />
            <ErrorCampo texto={mostrados.descripcion} />
          </View>

          <View style={estilos.campo}>
            <Text style={TEXTO.fila}>{tipo === 'tiradero' ? 'Foto' : 'Foto (opcional)'}</Text>
            <SelectorFoto onCambiar={(fotoUri) => cambiar({ fotoUri })} uri={borrador.fotoUri} />
            <ErrorCampo texto={mostrados.fotoUri} />
            <Text style={TEXTO.apoyo}>{TEXTO_PRIVACIDAD_FOTOS}</Text>
          </View>
        </>
      )}

      <ErrorCampo texto={error} />
      <Boton icono="send" onPress={guardar} texto={guardando ? 'Enviando…' : 'Enviar reporte'} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: CONTENIDO,
  campo: { gap: 8 },
  fechas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descripcion: {
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: 1,
    ...TEXTO.campo,
    minHeight: 110,
    padding: 14,
  },
});
