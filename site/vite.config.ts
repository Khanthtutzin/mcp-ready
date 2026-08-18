import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Served from https://<user>.github.io/mcp-stateless/, so assets need the
  // repository name as their base or every request 404s.
  base: '/mcp-stateless/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', sourcemap: false },
});
