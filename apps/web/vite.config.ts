import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const apiPort = process.env.API_PORT ?? '3000';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
