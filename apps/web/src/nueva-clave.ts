import { mensajeError, validarClave } from '@carmen-limpio/compartido';

// El enlace de «Olvidé mi contraseña» llega con una sesión temporal al final de la dirección (#access_token=…&type=recovery).
// Se guarda solo en memoria y se quita de la barra de direcciones y del historial antes de cualquier otra cosa.
const datos = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
if (location.hash || location.search) history.replaceState(null, '', location.pathname);

const token = datos.get('type') === 'recovery' ? datos.get('access_token') : null;
// Solo la clave anon (pública), igual que la app. La service_role jamás llega al sitio.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const formulario = document.getElementById('formulario') as HTMLFormElement;
const clave = document.getElementById('clave') as HTMLInputElement;
const repetir = document.getElementById('repetir') as HTMLInputElement;
const error = document.getElementById('error') as HTMLParagraphElement;
const boton = formulario.querySelector('button') as HTMLButtonElement;

function mostrar(id: 'formulario' | 'listo' | 'fallo') {
  for (const otro of ['formulario', 'listo', 'fallo']) {
    (document.getElementById(otro) as HTMLElement).hidden = otro !== id;
  }
}

async function auth(ruta: string, opciones: RequestInit) {
  return fetch(`${url}/auth/v1/${ruta}`, {
    ...opciones,
    headers: { apikey: anon!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

if (!token || !url || !anon) {
  if (!url || !anon) console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en la compilación del sitio');
  mostrar('fallo');
} else {
  mostrar('formulario');
  clave.focus();
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const problema =
    validarClave(clave.value) ?? (clave.value !== repetir.value ? 'Las contraseñas no coinciden.' : undefined);
  error.textContent = problema ?? '';
  if (problema) return;

  boton.disabled = true;
  boton.textContent = 'Un momento…';
  try {
    const respuesta = await auth('user', { method: 'PUT', body: JSON.stringify({ password: clave.value }) });
    if (respuesta.status === 401 || respuesta.status === 403) {
      mostrar('fallo');
      return;
    }
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => ({}))) as { msg?: string; message?: string; error_code?: string };
      error.textContent = mensajeError({ code: cuerpo.error_code, message: cuerpo.msg ?? cuerpo.message });
      return;
    }
    // La sesión del enlace ya no hace falta: se cierra para que no quede abierta en este navegador.
    await auth('logout', { method: 'POST' }).catch(() => {});
    mostrar('listo');
  } catch {
    error.textContent = mensajeError({ message: 'network' });
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar contraseña';
  }
});
