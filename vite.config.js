import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Martin95AM/',
  publicDir: 'frontend/public',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.GITHUB_SHA || 'local-dev'),
  },
});
