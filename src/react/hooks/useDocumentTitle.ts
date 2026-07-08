import { useEffect } from 'react';

/**
 * Sincroniza `<title>` + `meta[property="og:title"]` + `meta[name="twitter:title"]`
 * com um valor dinâmico. Roda só no client — o servidor Astro continua emitindo
 * o `<title>` estático do Layout até o hydration rodar, então esse hook atua
 * como sobrescrita em tempo real.
 *
 * @param title Texto a aplicar nas 3 tags. Quando o valor muda, o hook
 *              reaplica com o novo título. `null` desabilita o efeito
 *              (no-op) — útil antes do título real estar disponível
 *              (ex.: enquanto o doc ainda não foi hidratado do backend).
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title == null) return;
    document.title = title;
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', title);
    document
      .querySelector('meta[name="twitter:title"]')
      ?.setAttribute('content', title);
  }, [title]);
}
