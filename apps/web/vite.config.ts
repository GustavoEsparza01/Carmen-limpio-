import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { valores } from './contenido.ts';

// Reemplaza {{CLAVE}} en el HTML con los textos de compartido. Una clave desconocida detiene la compilación,
// para que nunca se publique un hueco.
function textosCompartidos(): Plugin {
  const datos = valores();
  return {
    name: 'textos-compartidos',
    transformIndexHtml(html) {
      return html.replace(/\{\{([A-Z_]+)\}\}/g, (_, clave: string) => {
        const valor = datos[clave];
        if (valor === undefined) throw new Error(`Falta el texto {{${clave}}}`);
        return valor;
      });
    },
  };
}

export default defineConfig({
  plugins: [textosCompartidos()],
  server: { port: 5174 },
  build: {
    rollupOptions: {
      input: {
        inicio: resolve(import.meta.dirname, 'index.html'),
        privacidad: resolve(import.meta.dirname, 'privacidad.html'),
      },
    },
  },
});
