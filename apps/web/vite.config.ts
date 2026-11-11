import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY ?? `http://127.0.0.1:${process.env.API_PORT ?? 3000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'node',
  },
});
