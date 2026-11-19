import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// La subruta donde se sirve la app (BASE_PATH=/taskflow en la imagen de producción). En desarrollo, la raíz
const basePath = (process.env.BASE_PATH ?? '').replace(/\/+$/, '')

export default defineConfig({
  base: `${basePath}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Las pruebas de componentes con userEvent (editor, diálogos) pasan de 5 s con la máquina cargada
    testTimeout: 20_000,
  },
})
