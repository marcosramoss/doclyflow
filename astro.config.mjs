import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
// O adapter fica instalado para que rotas com `prerender = false`
// (caso de `src/pages/dashboard/[id].astro`) sejam renderizadas on-demand.
// Todas as demais rotas continuam estáticas (output padrão do Astro 5).
export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
