import {
  ATRIBUCION_OSM,
  COLORES,
  DIAS_SEMANA,
  listaDias,
  NOMBRE_DIA,
  VENTANAS,
  type Dia,
  type Turno,
} from '@carmen-limpio/compartido';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALTURA_TACTIL, COLOR_TURNO, CONTENIDO, FUENTE, RADIO, SOMBRA, TARJETA, TEXTO } from '../estilos/tema';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const LETRA_DIA: Record<Dia, string> = {
  lunes: 'L',
  martes: 'M',
  miercoles: 'M',
  jueves: 'J',
  viernes: 'V',
  sabado: 'S',
  domingo: 'D',
};

// Cada pantalla fija el estilo al enfocarse: al regresar, la anterior lo recupera.
export function BarraEstado({ estilo }: { estilo: 'light' | 'dark' }) {
  useFocusEffect(useCallback(() => setStatusBarStyle(estilo), [estilo]));
  return null;
}

export function EtiquetaTurno({ turno, conHorario = false }: { turno: Turno; conHorario?: boolean }) {
  const { fondo, texto, icono } = COLOR_TURNO[turno];
  const { inicio, fin } = VENTANAS[turno];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fondo }]}>
      <Ionicons color={texto} name={icono} size={15} />
      <Text style={[estilos.etiquetaTexto, { color: texto }]}>
        {turno === 'matutino' ? 'Matutino' : 'Vespertino'}
        {conHorario && ` · ${inicio} a ${fin}`}
      </Text>
    </View>
  );
}

export function DiasSemana({ dias, hoy }: { dias: readonly Dia[]; hoy?: Dia }) {
  const etiqueta = `Días de recolección: ${listaDias(dias)}${hoy ? `. Hoy es ${NOMBRE_DIA[hoy]}` : ''}`;
  return (
    <View accessibilityLabel={etiqueta} accessible style={estilos.dias}>
      {DIAS_SEMANA.map((dia) => {
        const activo = dias.includes(dia);
        return (
          <View key={dia} style={[estilos.dia, activo && estilos.diaActivo, dia === hoy && estilos.diaHoy]}>
            <Text style={[estilos.diaTexto, activo && estilos.diaTextoActivo]}>{LETRA_DIA[dia]}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TarjetaAcceso({
  icono,
  titulo,
  subtitulo,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  subtitulo: string;
  // Sin acción, la tarjeta se muestra como no disponible.
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${titulo}. ${subtitulo}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [estilos.acceso, !onPress && estilos.accesoInactivo, pressed && estilos.filaPresionada]}
    >
      <IconoCirculo icono={icono} />
      <Text style={TEXTO.fila}>{titulo}</Text>
      <Text style={TEXTO.apoyo}>{subtitulo}</Text>
    </Pressable>
  );
}

export function InsigniaRuta({ numero, turno }: { numero: number; turno: Turno }) {
  const { fondo, texto } = COLOR_TURNO[turno];
  return (
    <View style={[estilos.insignia, { backgroundColor: fondo }]}>
      <Text style={[estilos.insigniaTexto, { color: texto }]}>{numero}</Text>
    </View>
  );
}

export function Boton({
  icono,
  texto,
  onPress,
  variante = 'principal',
}: {
  icono: NombreIcono;
  texto: string;
  onPress: () => void;
  variante?: 'principal' | 'secundario';
}) {
  const secundario = variante === 'secundario';
  const color = secundario ? COLORES.primario : COLORES.superficie;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.boton, secundario && estilos.botonSecundario, pressed && estilos.presionado]}
    >
      <Ionicons color={color} name={icono} size={20} />
      <Text style={[estilos.botonTexto, { color }]}>{texto}</Text>
    </Pressable>
  );
}

export function Aviso({ children, icono = 'information-circle' }: { children: ReactNode; icono?: NombreIcono }) {
  return (
    <View style={estilos.aviso}>
      <Ionicons color={COLORES.acentoTexto} name={icono} size={20} style={estilos.avisoIcono} />
      <Text style={estilos.avisoTexto}>{children}</Text>
    </View>
  );
}

export function FilaNavegable({
  titulo,
  subtitulo,
  detalle,
  inicio,
  plana = false,
  onPress,
}: {
  titulo: string;
  subtitulo?: string | null;
  detalle?: ReactNode;
  inicio?: ReactNode;
  plana?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.fila, plana && estilos.filaPlana, pressed && estilos.filaPresionada]}
    >
      {inicio}
      <View style={estilos.filaCuerpo}>
        <Text style={TEXTO.fila}>{titulo}</Text>
        {subtitulo && <Text style={TEXTO.apoyo}>{subtitulo}</Text>}
        {detalle}
      </View>
      <Ionicons color={COLORES.textoSuave} name="chevron-forward" size={20} />
    </Pressable>
  );
}

export function Pestanas<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { id: T; texto: string; icono?: NombreIcono }[];
  valor: T;
  onChange: (id: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={estilos.pestanas}>
      {opciones.map(({ id, texto, icono }) => {
        const activa = id === valor;
        const color = activa ? COLORES.primario : COLORES.textoSuave;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            key={id}
            onPress={() => onChange(id)}
            style={[estilos.pestana, activa && estilos.pestanaActiva]}
          >
            {icono && <Ionicons color={color} name={icono} size={17} />}
            <Text style={[estilos.pestanaTexto, { color }, activa && estilos.pestanaTextoActiva]}>{texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pastilla({ texto, activa, onPress }: { texto: string; activa: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={[estilos.pastilla, activa && estilos.pastillaActiva]}
    >
      <Text style={[estilos.pastillaTexto, activa && estilos.pastillaTextoActiva]}>{texto}</Text>
    </Pressable>
  );
}

export function PastillaRuta({
  numero,
  turno,
  color,
  activa,
  onPress,
}: {
  numero: number;
  turno: Turno;
  color: string;
  activa: boolean;
  onPress: () => void;
}) {
  const { icono } = COLOR_TURNO[turno];
  const tinta = activa ? COLORES.superficie : COLORES.texto;
  return (
    <Pressable
      accessibilityLabel={`Ruta ${numero}, ${turno}`}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={[estilos.pastilla, estilos.pastillaRuta, activa && estilos.pastillaActiva]}
    >
      <View style={[estilos.pastillaColor, { backgroundColor: color }]} />
      <Text style={[estilos.pastillaTexto, { color: tinta }]}>{numero}</Text>
      <Ionicons color={tinta} name={icono} size={14} />
    </Pressable>
  );
}

export function EtiquetaIlustrativa() {
  return (
    <View style={estilos.ilustrativo}>
      <Ionicons color={COLORES.acentoTexto} name="alert-circle" size={16} />
      <Text style={estilos.ilustrativoTexto}>Trazado ilustrativo</Text>
    </View>
  );
}

export function AtribucionOSM() {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
      style={estilos.atribucion}
    >
      <Text style={estilos.atribucionTexto}>{ATRIBUCION_OSM}</Text>
    </Pressable>
  );
}

export function BotonFlotante({
  icono,
  etiqueta,
  onPress,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.flotante, pressed && estilos.presionado]}
    >
      <Ionicons color={COLORES.texto} name={icono} size={22} />
    </Pressable>
  );
}

export function PantallaVacia({
  icono,
  titulo,
  texto,
  children,
}: {
  icono: NombreIcono;
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={estilos.vaciaContenido}>
      <BarraEstado estilo="dark" />
      <View style={estilos.vaciaIcono}>
        <Ionicons color={COLORES.primario} name={icono} size={44} />
      </View>
      <Text accessibilityRole="header" style={[TEXTO.subtitulo, estilos.vaciaTexto]}>
        {titulo}
      </Text>
      <Text style={[TEXTO.cuerpo, estilos.vaciaTexto]}>{texto}</Text>
      {children && <View style={estilos.vaciaAccion}>{children}</View>}
    </ScrollView>
  );
}

export function IconoCirculo({ icono }: { icono: NombreIcono }) {
  return (
    <View style={estilos.circulo}>
      <Ionicons color={COLORES.primario} name={icono} size={22} />
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIO.completo,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  etiquetaTexto: { fontFamily: FUENTE, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  dias: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  dia: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: COLORES.inactivo,
    borderRadius: RADIO.completo,
    flex: 1,
    justifyContent: 'center',
    maxWidth: 40,
  },
  diaActivo: { backgroundColor: COLORES.primario },
  diaHoy: { borderColor: COLORES.acentoTexto, borderWidth: 3 },
  diaTexto: { color: COLORES.inactivoTexto, fontFamily: FUENTE, fontSize: 14, fontWeight: '600' },
  diaTextoActivo: { color: COLORES.superficie, fontWeight: '700' },
  insignia: {
    alignItems: 'center',
    borderRadius: RADIO.medio,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  insigniaTexto: { fontFamily: FUENTE, fontSize: 20, fontWeight: '800' },
  boton: {
    alignItems: 'center',
    backgroundColor: COLORES.primario,
    borderColor: COLORES.primario,
    borderRadius: RADIO.medio,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  botonSecundario: { backgroundColor: COLORES.superficie },
  botonTexto: { fontFamily: FUENTE, fontSize: 17, fontWeight: '600' },
  presionado: { opacity: 0.8 },
  aviso: {
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.medio,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  avisoIcono: { marginTop: 1 },
  avisoTexto: {
    color: COLORES.acentoTexto,
    flex: 1,
    fontFamily: FUENTE,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  vaciaContenido: { ...CONTENIDO, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  vaciaIcono: {
    alignItems: 'center',
    backgroundColor: COLORES.primarioSuave,
    borderRadius: RADIO.completo,
    height: 96,
    justifyContent: 'center',
    marginBottom: 4,
    width: 96,
  },
  vaciaTexto: { textAlign: 'center' },
  vaciaAccion: { alignSelf: 'stretch', marginTop: 8 },
  pastillaRuta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  pastillaColor: { borderColor: COLORES.superficie, borderRadius: RADIO.completo, borderWidth: 1.5, height: 16, width: 16 },
  ilustrativo: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.acentoSuave,
    borderRadius: RADIO.completo,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ilustrativoTexto: { color: COLORES.acentoTexto, fontFamily: FUENTE, fontSize: 14, fontWeight: '600' },
  atribucion: {
    backgroundColor: COLORES.superficieTranslucida,
    borderRadius: RADIO.chico,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  atribucionTexto: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 12, fontWeight: '500' },
  acceso: { ...TARJETA, flexBasis: 170, flexGrow: 1, gap: 6, minHeight: 48, padding: 14 },
  accesoInactivo: { backgroundColor: COLORES.inactivo, elevation: 0, shadowOpacity: 0 },
  fila: {
    ...TARJETA,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filaPlana: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORES.borde,
    borderLeftWidth: 0,
    borderRadius: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    elevation: 0,
    paddingHorizontal: 20,
    shadowOpacity: 0,
  },
  filaPresionada: { backgroundColor: COLORES.primarioSuave },
  filaCuerpo: { flex: 1, gap: 2 },
  pestanas: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORES.borde,
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
  },
  pestana: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2.5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: ALTURA_TACTIL,
  },
  pestanaActiva: { borderBottomColor: COLORES.primario },
  pestanaTexto: { fontFamily: FUENTE, fontSize: 16, fontWeight: '500' },
  pestanaTextoActiva: { fontWeight: '700' },
  pastilla: {
    alignItems: 'center',
    backgroundColor: COLORES.inactivo,
    borderRadius: RADIO.chico,
    justifyContent: 'center',
    minHeight: ALTURA_TACTIL,
    paddingHorizontal: 14,
  },
  pastillaActiva: { backgroundColor: COLORES.texto },
  pastillaTexto: {
    color: COLORES.texto,
    fontFamily: FUENTE,
    fontSize: 15,
    fontWeight: '600',
  },
  pastillaTextoActiva: { color: COLORES.superficie },
  flotante: {
    ...SOMBRA,
    alignItems: 'center',
    backgroundColor: COLORES.superficie,
    borderRadius: RADIO.completo,
    elevation: 4,
    height: ALTURA_TACTIL,
    justifyContent: 'center',
    width: ALTURA_TACTIL,
  },
  circulo: {
    alignItems: 'center',
    backgroundColor: COLORES.primarioSuave,
    borderRadius: RADIO.medio,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
