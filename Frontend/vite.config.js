import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import Pages from 'vite-plugin-pages';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    Pages(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
