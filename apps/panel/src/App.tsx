import { AVISO_NO_OFICIAL } from '@carmen-limpio/compartido';
import { useEffect, useState, type ComponentType } from 'react';
import { Acceso, useDatosPanel } from './Acceso';
import { Avisos } from './vistas/Avisos';
import { Escenarios } from './vistas/Escenarios';
import { Reportes } from './vistas/Reportes';
import { Resumen } from './vistas/Resumen';
import { Rutas } from './vistas/Rutas';
import { Unidades } from './vistas/Unidades';

const VISTAS: { id: string; nombre: string; Vista: ComponentType }[] = [
  { id: 'resumen', nombre: 'Resumen', Vista: Resumen },
  { id: 'reportes', nombre: 'Reportes', Vista: Reportes },
  { id: 'rutas', nombre: 'Rutas', Vista: Rutas },
  { id: 'unidades', nombre: 'Unidades', Vista: Unidades },
  { id: 'avisos', nombre: 'Avisos', Vista: Avisos },
  { id: 'escenarios', nombre: 'Comparar escenarios', Vista: Escenarios },
];

const vistaDeHash = () => window.location.hash.slice(1) || 'resumen';

export function App() {
  return (
    <Acceso>
      <Panel />
    </Acceso>
  );
}

function Panel() {
  const { correo, salir } = useDatosPanel();
  const [actual, setActual] = useState(vistaDeHash);

  useEffect(() => {
    const cambiar = () => setActual(vistaDeHash());
    window.addEventListener('hashchange', cambiar);
    return () => window.removeEventListener('hashchange', cambiar);
  }, []);

  const { Vista } = VISTAS.find((v) => v.id === actual) ?? VISTAS[0]!;

  return (
    <div className="pagina">
      <header className="encabezado">
        <div>
          <h1>Carmen Limpio</h1>
          <p>Panel administrativo</p>
        </div>
        <div className="cuenta">
          <span>{correo}</span>
          <button className="boton boton-secundario" onClick={salir} type="button">
            Salir
          </button>
        </div>
      </header>
      <nav className="navegacion" aria-label="Secciones del panel">
        {VISTAS.map(({ id, nombre }) => (
          <a key={id} href={`#${id}`} aria-current={id === actual ? 'page' : undefined}>
            {nombre}
          </a>
        ))}
      </nav>
      <p className="vista-previa">
        Datos de Supabase. Avisos y reportes ya se gestionan aquí; rutas, horarios y unidades siguen en solo lectura.
      </p>
      <main className="contenido">
        <Vista />
      </main>
      <footer className="pie">{AVISO_NO_OFICIAL}</footer>
    </div>
  );
}
