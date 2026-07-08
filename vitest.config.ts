import { defineConfig } from 'vitest/config';

// Config mínima — só rodamos testes em Node, sem precisar do runtime
// Astro/React (jsPDF funciona em Node direto, e o gerador não importa nada
// além de tipos + utilitários puros).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
