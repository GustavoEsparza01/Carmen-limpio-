import {
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_SIN_PERMISO,
  buscarLugares,
  COLORES,
  descripcionRecordatorio,
  lugarPorId,
  NOMBRE_RECORDATORIO,
  textoHorario,
  type Lugar,
  type Recordatorio,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascota } from '../componentes/Mascota';
import { Aviso, BarraEstado, Boton, FilaNavegable, IconoCirculo, Pastilla } from '../componentes/ui';
import { useGuardados } from '../estado/guardados';
import { FUENTE, RADIO, SOMBRA, TEXTO } from '../estilos/tema';

const PASOS = 3;
const OPCIONES: Recordatorio[] = ['nocheAnterior', 'antesDeVentana', 'ninguno'];

function resumen(lugar: Lugar) {
  const [primero] = lugar.horarios;
  if (lugar.horarios.length > 1 || !primero) return `${lugar.horarios.length} horarios`;
  return textoHorario(primero.dias, primero.turno);
}

function PasoColonia({ onElegir }: { onElegir: (lugar: Lugar) => void }) {
  const [consulta, setConsulta] = useState('');
  const resultados = useMemo(() => buscarLugares(consulta).slice(0, 8), [consulta]);
  const buscando = consulta.trim().length > 0;
  return (
    <>
      <Text accessibilityRole="header" style={TEXTO.titulo}>
        Elige tu colonia
      </Text>
      <Text style={TEXTO.cuerpo}>Así podrás ver desde el inicio si hoy toca recolección.</Text>
      <View style={estilos.buscador}>
        <Ionicons color={COLORES.textoSuave} name="search" size={22} />
        <TextInput
          accessibilityLabel="Buscar colonia, fraccionamiento o avenida"
          autoCorrect={false}
          onChangeText={setConsulta}
          placeholder="Busca tu colonia"
          placeholderTextColor={COLORES.textoSuave}
          style={estilos.buscadorCampo}
          value={consulta}
        />
      </View>
      {buscando && resultados.length === 0 && (
        <Text style={TEXTO.cuerpo}>No encontramos ese lugar. Prueba con solo una parte del nombre.</Text>
      )}
      {buscando &&
        resultados.map((lugar) => (
          <FilaNavegable
            inicio={<IconoCirculo icono="location" />}
            key={lugar.id}
            onPress={() => onElegir(lugar)}
            subtitulo={resumen(lugar)}
            titulo={lugar.nombre}
          />
        ))}
    </>
  );
}

function PasoRecordatorio({ lugar, onSiguiente }: { lugar: Lugar | undefined; onSiguiente: () => void }) {
  const { guardados, cambiarRecordatorio } = useGuardados();
  const [sinPermiso, setSinPermiso] = useState(false);
  const elegido = guardados.find((g) => g.lugarId === lugar?.id)?.recordatorio ?? 'ninguno';
  const descripcion = descripcionRecordatorio(elegido);

  const elegir = async (tipo: Recordatorio) => {
    if (!lugar) return;
    setSinPermiso(!(await cambiarRecordatorio(lugar.id, tipo)));
  };

  return (
    <>
      <Text accessibilityRole="header" style={TEXTO.titulo}>
        Activa un recordatorio
      </Text>
      {lugar ? (
        <>
          <Text style={TEXTO.cuerpo}>Te avisamos en el teléfono cuando sea día de recolección en {lugar.nombre}.</Text>
          <View style={estilos.opciones}>
            {OPCIONES.map((tipo) => (
              <Pastilla activa={elegido === tipo} key={tipo} onPress={() => elegir(tipo)} texto={NOMBRE_RECORDATORIO[tipo]} />
            ))}
          </View>
          {descripcion && <Text style={TEXTO.apoyo}>{descripcion}</Text>}
          {sinPermiso && <Aviso icono="notifications-off">{AVISO_SIN_PERMISO}</Aviso>}
        </>
      ) : (
        <Text style={TEXTO.cuerpo}>Cuando guardes un lugar podrás activar un recordatorio desde su horario.</Text>
      )}
      <Boton icono="arrow-forward" onPress={onSiguiente} texto="Continuar" />
    </>
  );
}

function PasoAcerca({ onTerminar }: { onTerminar: () => void }) {
  return (
    <>
      <View style={estilos.mascota}>
        <Mascota tamano={120} />
      </View>
      <Text accessibilityRole="header" style={TEXTO.titulo}>
        Conoce Carmen Limpio
      </Text>
      <Text style={TEXTO.cuerpo}>Consulta qué días y en qué ventana hay recolección en tu colonia de Ciudad del Carmen.</Text>
      <Aviso>{AVISO_NO_OFICIAL}</Aviso>
      <Text style={TEXTO.apoyo}>{AVISO_HORARIOS}</Text>
      <Boton icono="checkmark" onPress={onTerminar} texto="Empezar" />
    </>
  );
}

export default function Bienvenida() {
  const { top, bottom } = useSafeAreaInsets();
  const { guardar, marcarBienvenida } = useGuardados();
  const [paso, setPaso] = useState(0);
  const [lugarId, setLugarId] = useState<string>();

  const terminar = () => {
    marcarBienvenida();
    router.replace('/');
  };

  const elegirLugar = (lugar: Lugar) => {
    guardar(lugar.id, 'casa');
    setLugarId(lugar.id);
    setPaso(1);
  };

  return (
    <View style={[estilos.pantalla, { paddingBottom: bottom, paddingTop: top }]}>
      <BarraEstado estilo="dark" />
      <View style={estilos.barra}>
        <Pressable accessibilityRole="button" hitSlop={14} onPress={terminar}>
          <Text style={estilos.omitir}>Omitir</Text>
        </Pressable>
        <Text style={TEXTO.apoyo}>
          Paso {paso + 1} de {PASOS}
        </Text>
      </View>
      <View accessibilityElementsHidden style={estilos.progreso}>
        {Array.from({ length: PASOS }, (_, i) => (
          <View key={i} style={[estilos.punto, i <= paso && estilos.puntoActivo]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        {paso === 0 && (
          <>
            <PasoColonia onElegir={elegirLugar} />
            <Boton icono="arrow-forward" onPress={() => setPaso(1)} texto="Continuar sin elegir" variante="secundario" />
          </>
        )}
        {paso === 1 && (
          <PasoRecordatorio lugar={lugarId ? lugarPorId(lugarId) : undefined} onSiguiente={() => setPaso(2)} />
        )}
        {paso === 2 && <PasoAcerca onTerminar={terminar} />}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { backgroundColor: COLORES.fondo, flex: 1 },
  barra: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  omitir: { color: COLORES.primario, fontFamily: FUENTE, fontSize: 16, fontWeight: '600' },
  progreso: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 10 },
  punto: { backgroundColor: COLORES.borde, borderRadius: RADIO.completo, flex: 1, height: 5 },
  puntoActivo: { backgroundColor: COLORES.primario },
  contenido: { gap: 14, padding: 20 },
  mascota: { alignItems: 'center' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buscador: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.grande,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  buscadorCampo: { color: COLORES.texto, flex: 1, fontFamily: FUENTE, fontSize: 17, fontWeight: '500', minHeight: 56 },
});
