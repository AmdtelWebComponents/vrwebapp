// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',           // Netlify loves static
  trailingSlash: 'never',
  build: {
    format: 'directory'
  }
});