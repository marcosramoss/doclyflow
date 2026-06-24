// Helpers de formatação de data compartilhados

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FMT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return DATE_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return DATE_TIME_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}
