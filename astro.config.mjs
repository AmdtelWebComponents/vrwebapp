// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',           // Netlify loves static
  trailingSlash: 'never',
  vite: {
    resolve: {
      dedupe: ['three']
    }
  },
  build: {
    format: 'directory'
  }
});