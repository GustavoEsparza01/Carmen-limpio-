// Mejora progresiva: sin JavaScript la página se lee completa (todas las leyendas visibles).
document.documentElement.classList.add('js');

const ZONA = 'America/Merida';
const PASOS = 4;

function reloj() {
  const hora = document.querySelector<HTMLElement>('[data-hora]');
  const fecha = document.querySelector<HTMLElement>('[data-fecha]');
  const ahora = new Date();
  if (hora) {
    hora.textContent = new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: ZONA,
    }).format(ahora);
  }
  if (fecha) {
    const texto = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: ZONA,
    }).format(ahora);
    fecha.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}

// El escenario mide varias pantallas de alto; el teléfono queda fijo y cambia de vista según el avance.
function recorrido() {
  const escenario = document.querySelector<HTMLElement>('.escenario');
  const escena = document.querySelector<HTMLElement>('.escena');
  if (!escenario || !escena) return;

  let actual = -1;
  const actualizar = () => {
    const { top, height } = escenario.getBoundingClientRect();
    const recorrible = Math.max(1, height - window.innerHeight);
    const avance = Math.min(0.999, Math.max(0, -top / recorrible));
    const paso = Math.floor(avance * PASOS);
    if (paso === actual) return;
    actual = paso;
    escena.dataset.paso = String(paso);
    document.querySelectorAll<HTMLElement>('[data-leyenda]').forEach((l) => {
      l.toggleAttribute('data-activa', l.dataset.leyenda === String(paso));
    });
    document.querySelectorAll<HTMLElement>('[data-vista]').forEach((v) => {
      v.toggleAttribute('data-activa', v.dataset.vista === String(paso));
      // Solo la vista visible se anuncia a los lectores de pantalla.
      v.setAttribute('aria-hidden', String(v.dataset.vista !== String(paso)));
    });
  };

  let pendiente = false;
  const alDesplazar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      actualizar();
    });
  };
  window.addEventListener('scroll', alDesplazar, { passive: true });
  window.addEventListener('resize', alDesplazar);
  actualizar();
}

reloj();
setInterval(reloj, 30_000);
recorrido();
