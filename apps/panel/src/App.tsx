import { AVISO_NO_OFICIAL } from '@carmen-limpio/compartido';
import { useEffect, useState, type ComponentType } from 'react';
import { Escenarios } from './vistas/Escenarios';
import { Resumen } from './vistas/Resumen';
import { Rutas } from './vistas/Rutas';
import { Unidades } from './vistas/Unidades';

const VISTAS: { id: string; nombre: string; Vista: ComponentType }[] = [
  { id: 'resumen', nombre: 'Resumen', Vista: Resumen },
  { id: 'rutas', nombre: 'Rutas', Vista: Rutas },
  { id: 'unidades', nombre: 'Unidades', Vista: Unidades },
  { id: 'escenarios', nombre: 'Comparar escenarios', Vista: Escenarios },
];

const vistaDeHash = () => window.location.hash.slice(1) || 'resumen';

export function App() {
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
        <h1>Carmen Limpio</h1>
        <p>Panel administrativo</p>
      </header>
      <nav className="navegacion" aria-label="Secciones del panel">
        {VISTAS.map(({ id, nombre }) => (
          <a key={id} href={`#${id}`} aria-current={id === actual ? 'page' : undefined}>
            {nombre}
          </a>
        ))}
      </nav>
      <p className="vista-previa">
        Vista previa con datos locales. Todavía no tiene inicio de sesión ni guarda cambios.
      </p>
      <main className="contenido">
        <Vista />
      </main>
      <footer className="pie">{AVISO_NO_OFICIAL}</footer>
    </div>
  );
}
