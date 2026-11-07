export const ZONA_HORARIA = 'America/Merida';

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS_SEMANA)[number];

// Días generales de los carteles; las excepciones van por lugar.
export const DIAS_CARTEL: readonly Dia[] = ['martes', 'jueves', 'sabado'];

export const NOMBRE_DIA: Record<Dia, string> = {
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
  sabado: 'sábado',
  domingo: 'domingo',
};

export type Turno = 'matutino' | 'vespertino';

// Ventanas de los carteles "Ubica tu ruta". Nunca son una hora exacta de llegada.
export const VENTANAS: Record<Turno, { inicio: string; fin: string }> = {
  matutino: { inicio: '7:00', fin: '15:00' },
  vespertino: { inicio: '15:00', fin: '23:00' },
};

export const AVISO_NO_OFICIAL =
  'Carmen Limpio es un proyecto independiente. No es una app oficial del municipio ni de la empresa recolectora.';

export const AVISO_NO_OFICIAL_CORTO = 'App independiente, no oficial.';

export const AVISO_REPORTES_DEMOSTRACION = 'Es una demostración: los reportes no se enviarán a nadie.';

export const AVISO_SIN_MAPA = 'Sin conexión no se puede cargar el mapa base. Los horarios siguen disponibles.';

export const AVISO_SILUETA = 'Formas ilustrativas: no indican el sentido ni el orden del recorrido.';

export const AVISO_SIN_PERMISO =
  'Sin permiso de notificaciones no podemos avisarte. La app sigue funcionando y puedes activarlo en los ajustes del teléfono.';

export const AVISO_SIN_PERMISO_CAMARA = 'Sin permiso de cámara puedes elegir una foto de la galería.';

export const AVISO_AVISOS_EJEMPLO = 'Avisos de ejemplo para mostrar cómo se vería esta sección. Ninguno es real.';

export const TEXTO_PRIVACIDAD_FOTOS = 'La foto se queda en este teléfono y no se publica ni se envía.';

export const AVISO_PRIVACIDAD_BORRADOR = 'Borrador pendiente de revisión legal. Aplica solo a esta demostración.';

// Borrador con la estructura de la LFPDPPP. Lo marcado como pendiente no se ha definido.
export const BORRADOR_PRIVACIDAD: readonly { titulo: string; texto: string }[] = [
  { titulo: 'Responsable', texto: 'Pendiente de definir. Carmen Limpio es un proyecto independiente, no oficial.' },
  {
    titulo: 'Datos que se usan',
    texto: 'Lugar, fecha, punto en el mapa, descripción y foto del reporte. No pedimos tu nombre, correo ni teléfono.',
  },
  { titulo: 'Finalidad', texto: 'Mostrar cómo funcionarían los reportes. No se atiende ningún reporte.' },
  { titulo: 'Dónde se guardan', texto: 'Solo en este teléfono. No se envían a nadie ni se transfieren a terceros.' },
  { titulo: 'Tus derechos', texto: 'Puedes borrar tus reportes y sus fotos cuando quieras desde la sección Reportes.' },
  { titulo: 'Cambios', texto: 'Este texto cambiará antes de usar datos reales, y se pedirá aceptar la nueva versión.' },
];

export const AVISO_ILUSTRATIVO = 'Datos ilustrativos, pendientes de validación oficial.';

export const AVISO_HORARIOS =
  'Los horarios son ventanas, no horas exactas de llegada. Vienen de carteles públicos y no tienen validación oficial.';

export const AVISO_TRAZADO =
  'Trazado ilustrativo: une los lugares de la ruta, pero no pasa por todas las calles ni tiene validación oficial.';

export const AVISO_FUENTE_HOY = 'Según carteles públicos; el horario puede variar.';

export const AVISO_POR_CONFIRMAR = 'Por confirmar: estos días se dedujeron del cartel.';

export const AVISO_SIMULACION = 'Simulación: no es la ubicación real de ningún camión.';

export const ATRIBUCION_OSM = '© OpenStreetMap';

// Paleta propia: no reutiliza la identidad visual de los carteles.
export const COLORES = {
  errorTexto: '#B3261E',
  primario: '#0B4F6C',
  primarioSuave: '#E3EFF4',
  acentoSuave: '#FDF0DC',
  acentoTexto: '#7C3A06',
  texto: '#16242C',
  textoSuave: '#4A5C66',
  fondo: '#F7F9FA',
  superficie: '#FFFFFF',
  borde: '#D5DEE3',
  inactivo: '#E9EEF1',
  inactivoTexto: '#5B6C75',
  matutinoSuave: '#FFF1D6',
  matutinoTexto: '#7A4A00',
  vespertinoSuave: '#E8E7FB',
  vespertinoTexto: '#3F3A8C',
} as const;
