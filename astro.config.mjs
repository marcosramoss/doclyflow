import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// https://astro.build/config
// 100% estático por design — toda a área autenticada é servida como página
// HTML clonada e a navegação entre documentos é resolvida client-side via
// query string (`/painel/document?id=<uuid>`). Isso permite o deploy em
// qualquer servidor estático (Apache do XAMPP, github pages, S3, nginx serve)
// sem precisar subir um runtime Node.

// ----------------------------------------------------------------------------
// Fail-fast: exigir `PUBLIC_API_URL` em `.env` evita esquecer de apontar o
// frontend para a API correta. Sem isso o fallback em `src/data/api.ts`
// aponta para `http://127.0.0.1:8080/api` (o `php -S` de dev) e o login
// cai em "Não foi possível contatar o servidor." em qualquer deploy real.
//
// Usamos `loadEnv` do Vite explicitamente porque a ordem "Astro carrega
// .env antes do astro.config" não é garantida em todas as variações
// (`astro --env-file`, múltiplos loaders, versionamentos Astro/Vite).
// `loadEnv(mode, cwd, '')` retorna todas as variáveis sem prefixo, e roda
// de forma síncrona no momento da avaliação deste arquivo.
// ----------------------------------------------------------------------------
const loadedEnv = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '', // sem filtro de prefixo
);
const PUBLIC_API_URL = loadedEnv.PUBLIC_API_URL?.trim();
if (!PUBLIC_API_URL) {
  throw new Error(
    '[astro.config] Variável de ambiente obrigatória ausente: PUBLIC_API_URL\n' +
    '\n' +
    'Crie um arquivo `.env` na raiz do projeto com uma das opções abaixo:\n' +
    '\n' +
    '  # dev com XAMPP Apache servindo frontend + API na :80\n' +
    '  PUBLIC_API_URL=http://localhost/api\n' +
    '\n' +
    '  # dev com `php -S 127.0.0.1:8080 -t api/public` + `npm run dev`\n' +
    '  PUBLIC_API_URL=http://127.0.0.1:8080/api\n' +
    '\n' +
    '  # produção\n' +
    '  PUBLIC_API_URL=https://api.seudominio.com\n' +
    '\n' +
    'Em CI basta exportar a variável antes de `npm run build`.\n' +
    'Detalhes em deploy/README.md.',
  );
}

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
