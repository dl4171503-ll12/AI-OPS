import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { schoolLlmPlugin } from './vite-plugins/school-llm';

export default defineConfig({
  plugins: [schoolLlmPlugin(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '127.0.0.1',
    port: 919,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 920,
    strictPort: true,
  },
});
