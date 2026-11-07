import { COLORES, type EstadoHoy, type Turno } from '@carmen-limpio/compartido';
import { StyleSheet, type ViewStyle } from 'react-native';

export const FUENTE = 'Figtree';

export const RADIO = { chico: 8, medio: 12, grande: 16, completo: 999 } as const;

export const COLOR_TURNO: Record<Turno, { fondo: string; texto: string; icono: 'sunny' | 'moon' }> = {
  matutino: { fondo: COLORES.matutinoSuave, texto: COLORES.matutinoTexto, icono: 'sunny' },
  vespertino: { fondo: COLORES.vespertinoSuave, texto: COLORES.vespertinoTexto, icono: 'moon' },
};

// El texto y el icono dicen lo mismo que el color. Sin íconos de "listo": no sabemos si hubo recolección.
export const COLOR_ESTADO_HOY: Record<
  EstadoHoy,
  { fondo: string; texto: string; icono: 'today' | 'time' | 'calendar-clear' | 'calendar'; etiqueta: string }
> = {
  antes: { fondo: COLORES.primario, texto: COLORES.superficie, icono: 'today', etiqueta: 'Hoy' },
  enCurso: { fondo: COLORES.acentoTexto, texto: COLORES.superficie, icono: 'time', etiqueta: 'Ahora' },
  terminada: { fondo: COLORES.inactivo, texto: COLORES.texto, icono: 'calendar-clear', etiqueta: 'Terminada' },
  otroDia: { fondo: COLORES.primarioSuave, texto: COLORES.primario, icono: 'calendar', etiqueta: 'Sin ventana hoy' },
};

export const SOMBRA: ViewStyle = {
  elevation: 2,
  shadowColor: COLORES.primario,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
};

export const TEXTO = StyleSheet.create({
  titulo: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  subtitulo: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  fila: { color: COLORES.texto, fontFamily: FUENTE, fontSize: 17, fontWeight: '600', lineHeight: 23 },
  cuerpo: { color: COLORES.textoSuave, fontFamily: FUENTE, fontSize: 16, fontWeight: '400', lineHeight: 23 },
  apoyo: { color: COLORES.textoSuave, fontFamily: FUENTE, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  seccion: {
    color: COLORES.textoSuave,
    fontFamily: FUENTE,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 20,
  },
});

export const TARJETA: ViewStyle = {
  backgroundColor: COLORES.superficie,
  borderColor: COLORES.borde,
  borderRadius: RADIO.grande,
  borderWidth: StyleSheet.hairlineWidth,
  ...SOMBRA,
};
