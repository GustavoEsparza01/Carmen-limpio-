import {
  AVISO_FUENTE_HOY,
  AVISO_HORARIOS,
  AVISO_NO_OFICIAL,
  AVISO_PRIVACIDAD,
  AVISO_PRIVACIDAD_BORRADOR,
  AVISO_REPORTES,
  AVISO_TRAZADO,
  LUGARES,
  RUTAS,
  tieneMapa,
  VENTANAS,
  VERSION_AVISO_PRIVACIDAD,
} from '@carmen-limpio/compartido';

// Textos que el sitio toma de compartido al compilarse, para decir lo mismo que la app.
// En el HTML aparecen como {{CLAVE}}; vite.config.ts los reemplaza.

// Pendiente: el usuario dará los nombres y el contacto. No se inventan.
export const EQUIPO: readonly { nombre: string; rol: string }[] = [];
export const CONTACTO: { correo: string } | null = null;

// La app se descargará como APK desde este sitio. Mientras sea null, el sitio dice «Próximamente».
// Cuando exista (Fase 6), pon aquí su dirección (p. ej. '/descargas/carmen-limpio.apk') y su versión.
export const APK: { url: string; version: string } | null = null;

function botonDescarga(clase: string): string {
  if (!APK) {
    return `<span aria-disabled="true" class="boton ${clase} boton-inactivo" role="link">Próximamente: descarga la APK aquí</span>`;
  }
  return `<a class="boton ${clase}" download href="${escapar(APK.url)}">Descargar la APK (versión ${escapar(APK.version)})</a>`;
}

function estadoDescarga(): string {
  if (!APK) {
    return '<p class="mono descarga-estado">Próximamente · APK para Android</p>';
  }
  return `<p class="mono descarga-estado">Disponible · versión ${escapar(APK.version)}</p>`;
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function seccionesPrivacidad(): string {
  return AVISO_PRIVACIDAD.map(
    ({ titulo, texto }) => `<section class="bloque"><h2>${escapar(titulo)}</h2><p>${escapar(texto)}</p></section>`,
  ).join('\n');
}

function equipo(): string {
  if (EQUIPO.length === 0) {
    return '<p class="pendiente">Pronto publicaremos quiénes forman el equipo.</p>';
  }
  return `<ul class="equipo">${EQUIPO.map(
    (p) => `<li><strong>${escapar(p.nombre)}</strong><span>${escapar(p.rol)}</span></li>`,
  ).join('')}</ul>`;
}

function contacto(): string {
  if (!CONTACTO) return '<p class="pendiente">Pronto publicaremos un correo de contacto.</p>';
  const correo = escapar(CONTACTO.correo);
  return `<p>Escríbenos a <a href="mailto:${correo}">${correo}</a>.</p>`;
}

export function valores(): Record<string, string> {
  return {
    AVISO_NO_OFICIAL: escapar(AVISO_NO_OFICIAL),
    AVISO_HORARIOS: escapar(AVISO_HORARIOS),
    AVISO_TRAZADO: escapar(AVISO_TRAZADO),
    AVISO_REPORTES: escapar(AVISO_REPORTES),
    AVISO_PRIVACIDAD_BORRADOR: escapar(AVISO_PRIVACIDAD_BORRADOR),
    VERSION_AVISO_PRIVACIDAD: escapar(VERSION_AVISO_PRIVACIDAD),
    AVISO_FUENTE_HOY: escapar(AVISO_FUENTE_HOY),
    NUM_RUTAS: String(RUTAS.length),
    NUM_LUGARES: String(LUGARES.length),
    NUM_EN_MAPA: String(LUGARES.filter(tieneMapa).length),
    VENTANA_MATUTINA: `${VENTANAS.matutino.inicio} a ${VENTANAS.matutino.fin}`,
    VENTANA_VESPERTINA: `${VENTANAS.vespertino.inicio} a ${VENTANAS.vespertino.fin}`,
    SECCIONES_PRIVACIDAD: seccionesPrivacidad(),
    BOTON_DESCARGA: botonDescarga('boton-oscuro'),
    BOTON_DESCARGA_CLARO: botonDescarga('boton-claro'),
    ESTADO_DESCARGA: estadoDescarga(),
    EQUIPO: equipo(),
    CONTACTO: contacto(),
  };
}
