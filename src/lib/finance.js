export const DEBT_STATUS_LABELS = {
  open: 'Aberto',
  min_paid: 'Mínimo pago',
  clean: 'Limpo',
  waiting: 'Pode esperar',
  blocked: 'Bloqueado',
};

export const APR_LABELS = {
  high: 'Juro alto',
  medium: 'Juro médio',
  low: 'Juro baixo',
  none: 'Sem juro',
};

export const SUB_STATUS_LABELS = {
  active: 'Ativa',
  keep: 'Manter',
  cancel: 'Cancelar',
  cancelled: 'Cancelada',
  installment: 'Parcela',
};

export const LANE_LABELS = {
  work: 'Trabalho',
  personal: 'Pessoal',
};

export const FINANCE_TABS = [
  { id: 'agora', label: 'Agora' },
  { id: 'dividas', label: 'Dívidas' },
  { id: 'parcelas', label: 'Parcelas' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'extrato', label: 'Extrato' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'metas', label: 'Metas' },
];

export function formatBrl(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDay(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—';
  const [y, m, d] = ymd.split('-');
  if (!d) return ymd;
  return `${d}/${m}${y ? `/${y.slice(2)}` : ''}`;
}

export function debtTone(status, apr) {
  if (status === 'clean') return 'text-muted-foreground';
  if (status === 'blocked' || apr === 'high') return 'text-amber-200';
  if (status === 'waiting') return 'text-muted-foreground';
  return 'text-foreground';
}

export function financeSummaryPhrase(caixa, invested) {
  const c = Number(caixa || 0);
  const inv = Number(invested || 0);
  if (c > 0 && inv > 0) {
    return `Livre ${formatBrl(c)} no Inter. Outros ${formatBrl(inv)} em auto-invest.`;
  }
  if (c === 0 && inv > 0) {
    return `Caixa livre zerado. Tem ${formatBrl(inv)} em auto-invest. Não misture com o que vence.`;
  }
  if (c === 0 && inv === 0) {
    return "Caixa e investimento zerados neste recorte.";
  }
  return `Caixa livre ${formatBrl(c)}.`;
}
