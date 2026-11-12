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

// Los reportes son reales, pero no llegan a ninguna autoridad: los revisa el equipo del proyecto.
export const AVISO_REPORTES =
  'Tus reportes los revisa el equipo de Carmen Limpio como demostración. No llegan al municipio ni a la empresa recolectora.';

export const AVISO_SIN_MAPA = 'Sin conexión no se puede cargar el mapa base. Los horarios siguen disponibles.';

export const AVISO_SILUETA = 'Formas ilustrativas: no indican el sentido ni el orden del recorrido.';

export const AVISO_SIN_PERMISO =
  'Sin permiso de notificaciones no podemos avisarte. La app sigue funcionando y puedes activarlo en los ajustes del teléfono.';

export const AVISO_SIN_PERMISO_CAMARA = 'Sin permiso de cámara puedes elegir una foto de la galería.';

export const AVISO_AVISOS_EJEMPLO = 'Avisos de ejemplo para mostrar cómo se vería esta sección. Ninguno es real.';

// Los publica el equipo del proyecto; no son comunicados del municipio ni de la empresa recolectora.
export const AVISO_AVISOS_EQUIPO = 'Avisos publicados por el equipo de Carmen Limpio. No son comunicados oficiales.';

export const AVISOS_VACIO = { titulo: 'Sin avisos por ahora', texto: 'Cuando haya un cambio en la recolección lo verás aquí.' };

export const AVISOS_SIN_CONEXION = {
  titulo: 'No pudimos cargar los avisos',
  texto: 'Revisa tu conexión e inténtalo de nuevo. Los horarios siguen disponibles.',
};

export const TEXTO_PRIVACIDAD_FOTOS = 'La foto solo la ven tú y el equipo del proyecto. No se publica.';

export const AVISO_PRIVACIDAD_BORRADOR = 'Borrador pendiente de revisión legal. Lo marcado como pendiente aún no se define.';

// Cambia la versión cuando cambie el texto: la app pedirá aceptar la nueva.
export const VERSION_AVISO_PRIVACIDAD = '2026-11-10-borrador';

// Borrador con la estructura de la LFPDPPP. Lo marcado como pendiente no se ha definido.
export const AVISO_PRIVACIDAD: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Responsable',
    texto: 'Pendiente de definir, con su domicilio y contacto. Carmen Limpio es un proyecto independiente, no oficial.',
  },
  {
    titulo: 'Datos que se usan',
    texto:
      'Tu correo y una contraseña, para tu cuenta. En cada reporte: el lugar, la fecha, el punto que marques en el mapa, la descripción y la foto, según el tipo. No pedimos tu nombre ni tu teléfono, ni usamos el GPS del teléfono.',
  },
  {
    titulo: 'Finalidad',
    texto:
      'Crear tu cuenta, recibir tus reportes y mostrarte su seguimiento. Los revisa el equipo del proyecto como demostración: no se envían al municipio ni a la empresa recolectora.',
  },
  {
    titulo: 'Quién los ve',
    texto: 'Tú y el equipo del proyecto. Las fotos no son públicas. Las estadísticas no muestran quién reportó.',
  },
  {
    titulo: 'Dónde se guardan',
    texto:
      'En Supabase, un servicio de base de datos en la nube que los guarda por cuenta del proyecto. No se venden ni se comparten con terceros.',
  },
  {
    titulo: 'Tus derechos',
    texto:
      'Puedes ver tus reportes en la app y eliminar tu cuenta, con tus reportes y fotos, desde la sección Reportes. Para otras solicitudes: contacto pendiente de definir.',
  },
  { titulo: 'Cambios', texto: 'Si este aviso cambia, la app te pedirá aceptar la nueva versión antes de reportar.' },
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

// Sitio público (apps/web en Vercel). El enlace de confirmación de correo regresa a CONFIRMACION_CORREO;
// la dirección debe estar en Supabase, Authentication → URL Configuration → Redirect URLs.
export const URL_SITIO = 'https://carmen-limpio.vercel.app';
export const CONFIRMACION_CORREO = `${URL_SITIO}/confirmado.html`;

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
  superficieTranslucida: 'rgba(255, 255, 255, 0.9)',
  borde: '#D5DEE3',
  inactivo: '#E9EEF1',
  inactivoTexto: '#5B6C75',
  matutinoSuave: '#FFF1D6',
  matutinoTexto: '#7A4A00',
  vespertinoSuave: '#E8E7FB',
  vespertinoTexto: '#3F3A8C',
} as const;
