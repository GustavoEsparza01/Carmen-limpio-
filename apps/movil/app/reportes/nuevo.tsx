import {
  AVISO_REPORTES_DEMOSTRACION,
  COLORES,
  etiquetaFecha,
  fechasRecientes,
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
import { useDemo } from '../../estado/demo';
import { FUENTE, RADIO, TEXTO } from '../../estilos/tema';

function esTipo(valor: string | undefined): valor is TipoReporte {
  return valor === 'noPaso' || valor === 'acumulacion' || valor === 'tiradero';
}

export default function NuevoReporte() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const { crear } = useDemo();
  const [ahora] = useState(() => new Date());
  const [borrador, setBorrador] = useState<Partial<BorradorReporte>>({});
  const [revisar, setRevisar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  if (!esTipo(tipo)) return <Text style={[TEXTO.cuerpo, estilos.contenido]}>No reconocemos este tipo de reporte.</Text>;

  const datos: BorradorReporte = { ...borrador, tipo };
  const errores = validarReporte(datos, ahora);
  const mostrados = revisar ? errores : {};
  const cambiar = (campos: Partial<BorradorReporte>) => setBorrador((actual) => ({ ...actual, ...campos }));

  const guardar = async () => {
    setRevisar(true);
    if (Object.keys(errores).length > 0 || guardando) return;
    setGuardando(true);
    const reporte = await crear(datos);
    router.replace(`/reportes/${reporte.id}`);
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <BarraEstado estilo="dark" />
      <Stack.Screen options={{ title: NOMBRE_TIPO_REPORTE[tipo] }} />
      <Aviso>{AVISO_REPORTES_DEMOSTRACION}</Aviso>

      {tipo !== 'tiradero' && (
        <View style={estilos.campo}>
          <Text style={TEXTO.fila}>{tipo === 'noPaso' ? 'Colonia o lugar' : 'Ubicación'}</Text>
          <SelectorLugar lugarId={borrador.lugarId} onCambiar={(lugarId) => cambiar({ lugarId })} />
          <ErrorCampo texto={mostrados.lugarId} />
        </View>
      )}

      {tipo === 'noPaso' && (
        <View style={estilos.campo}>
          <Text style={TEXTO.fila}>Fecha</Text>
          <View style={estilos.fechas}>
            {fechasRecientes(ahora).map((fecha) => (
              <Pastilla
                activa={borrador.fecha === fecha}
                key={fecha}
                onPress={() => cambiar({ fecha })}
                texto={etiquetaFecha(fecha, ahora)}
              />
            ))}
          </View>
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

      <Boton icono="save" onPress={guardar} texto="Guardar reporte de demostración" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 16, padding: 20 },
  campo: { gap: 8 },
  fechas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descripcion: {
    backgroundColor: COLORES.superficie,
    borderColor: COLORES.borde,
    borderRadius: RADIO.medio,
    borderWidth: 1,
    color: COLORES.texto,
    fontFamily: FUENTE,
    fontSize: 17,
    minHeight: 110,
    padding: 14,
  },
});
