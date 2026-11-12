import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Un solo .env en la raíz del monorepo para la app y el panel.
  envDir: '../..',
  plugins: [react()],
  server: { port: 5173 },
});
