import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { praxisApi } from "@/api/praxisClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PageHero,
  SectionHeading,
  PraxisEmptyState,
  PraxisColumnsSkeleton,
} from "@/components/layout/PraxisPage";
import {
  APR_LABELS,
  DEBT_STATUS_LABELS,
  FINANCE_TABS,
  LANE_LABELS,
  SUB_STATUS_LABELS,
  debtTone,
  financeSummaryPhrase,
  formatBrl,
  formatDay,
} from "@/lib/finance";
import { cn } from "@/lib/utils";

function invalidateFinance(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["finance"] });
}

function TabChips({ tab, onChange }) {
  return (
    <div className="praxis-scroll-x flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto py-1">
      {FINANCE_TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "praxis-touch-target flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors",
            tab === item.id
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

const SOURCE_CHIP_LABELS = {
  joao: "joão",
  pierre: "pierre",
  oficial: "oficial",
  seed: "seed",
  agent: "agente",
  projecao: "projeção",
  projeção: "projeção",
};

function SourceChip({ label, source }) {
  const text = label || SOURCE_CHIP_LABELS[source] || source;
  if (!text) return null;
  return (
    <Badge variant="outline" className="border-white/10 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {text}
    </Badge>
  );
}

function ProgressBar({ value, max, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Financas() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("agora");
  const [payDebt, setPayDebt] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [caixaOpen, setCaixaOpen] = useState(false);
  const [caixaAmount, setCaixaAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");

  const { data: overview, isLoading, isError } = useQuery({
    queryKey: ["finance", "overview"],
    queryFn: () => praxisApi.finance.overview(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["finance", "subscriptions"],
    queryFn: () => praxisApi.finance.subscriptions.list(),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ["finance", "installments"],
    queryFn: () => praxisApi.finance.installments.list({ status: "open" }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance", "transactions"],
    queryFn: () => praxisApi.finance.transactions.list(),
    enabled: tab === "extrato" || tab === "graficos",
  });

  const { data: insights } = useQuery({
    queryKey: ["finance", "insights"],
    queryFn: () => praxisApi.finance.insights(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["finance", "goals"],
    queryFn: () => praxisApi.finance.goals.list(),
    enabled: tab === "metas" || tab === "agora",
  });

  const syncMutation = useMutation({
    mutationFn: () => praxisApi.finance.sync(),
    onSuccess: () => {
      toast.success("Finanças sincronizadas");
      invalidateFinance(queryClient);
    },
    onError: (err) => {
      if (err?.status === 503 || err?.message === "pierre_not_configured") {
        toast.info("Bancos ainda não ligados");
      } else {
        toast.error(err.message || "Não deu para sincronizar");
      }
    },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => praxisApi.finance.debts.pay(id, data),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setPayDebt(null);
      invalidateFinance(queryClient);
    },
    onError: (err) => toast.error(err.message || "Não deu para registrar"),
  });

  const caixaMutation = useMutation({
    mutationFn: (amount) =>
      praxisApi.finance.balances.create({
        account_id: "acc-inter",
        amount,
        amount_kind: "available",
        source: "joao",
        locked: true,
        note: "saldo conferido no app",
      }),
    onSuccess: () => {
      toast.success("Saldo do Inter atualizado");
      setCaixaOpen(false);
      invalidateFinance(queryClient);
    },
    onError: (err) => toast.error(err.message || "Não deu para atualizar"),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id) => praxisApi.finance.subscriptions.remove(id),
    onSuccess: () => {
      toast.success("Tirei da lista");
      invalidateFinance(queryClient);
    },
    onError: (err) => toast.error(err.message || "Não deu para apagar"),
  });

  const operationalId = overview?.accounts?.find((a) => a.is_operational)?.id || "acc-inter";

  const openDebts = useMemo(
    () => (overview?.debts || []).filter((d) => d.status !== "clean"),
    [overview],
  );
  const cleanDebts = useMemo(
    () => (overview?.debts || []).filter((d) => d.status === "clean"),
    [overview],
  );
  const liveSubs = subscriptions.filter((s) => s.status !== "cancelled" && s.status !== "cancel" && s.status !== "installment");
  const workSubs = liveSubs.filter((s) => s.lane === "work");
  const personalSubs = liveSubs.filter((s) => s.lane === "personal");
  const visibleTx = txCategory
    ? transactions.filter((t) => t.category === txCategory)
    : transactions;
  const maxCat = insights?.categories?.[0]?.amount || 1;

  const topCategories = useMemo(
    () => (insights?.categories || []).slice(0, 5),
    [insights],
  );
  const topCategoriesMax = useMemo(
    () => topCategories[0]?.amount || 1,
    [topCategories],
  );

  const syncedAccounts = useMemo(() => {
    const accounts = overview?.accounts || [];
    const fromPierre = accounts.filter(
      (a) => a.available_source === "pierre" || a.invested_source === "pierre" || a.pierre_account_id,
    );
    if (fromPierre.length > 0) return fromPierre;
    return accounts.filter((a) => (a.available || 0) > 0 || (a.invested || 0) > 0);
  }, [overview]);

  const bankEntries = useMemo(() => {
    const list = [];
    for (const acc of syncedAccounts) {
      if (acc.available !== undefined && acc.available !== null) {
        list.push({
          id: `${acc.id}-available`,
          name: acc.name,
          kind: "available",
          kindLabel: "livre",
          amount: acc.available,
          source: acc.available_source || "pierre",
          asOf: acc.available_as_of,
        });
      }
      if (Number(acc.invested || 0) > 0) {
        list.push({
          id: `${acc.id}-invested`,
          name: acc.name,
          kind: "invested",
          kindLabel: "auto-invest",
          amount: acc.invested,
          source: acc.invested_source || "pierre",
          asOf: acc.invested_as_of,
        });
      }
    }
    return list;
  }, [syncedAccounts]);

  function openPay(debt) {
    setPayDebt(debt);
    setPayAmount(String(debt.balance ?? ""));
  }

  function submitPay() {
    if (!payDebt) return;
    payMutation.mutate({
      id: payDebt.id,
      data: {
        amount: Number(String(payAmount).replace(",", ".")),
        account_id: operationalId,
        method: "pix",
      },
    });
  }

  if (isLoading) {
    return (
      <div className="praxis-page">
        <PraxisColumnsSkeleton />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="praxis-page">
        <PraxisEmptyState
          title="Finanças não carregou"
          description="A API não respondeu. Tenta de novo em instantes."
        />
      </div>
    );
  }

  return (
    <div className="praxis-page space-y-8">
      <PageHero
        kicker="Dinheiro"
        kickerIcon={Wallet}
        title="Finanças"
        description={financeSummaryPhrase(overview.caixa, overview.invested)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? "Sincronizando…" : "Sincronizar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setCaixaAmount(String(overview.caixa ?? ""));
                setCaixaOpen(true);
              }}
            >
              Atualizar saldo
            </Button>
          </div>
        }
      />

      <Card className="border-primary/25 bg-primary/[0.07]">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary/80">Próximo passo</p>
            <p className="text-lg font-semibold leading-snug tracking-[-0.03em]">{overview.next_step?.label}</p>
          </div>
          {overview.next_step?.kind === "due" && overview.next_step.debt_id ? (
            <Button
              type="button"
              className="h-10 shrink-0 rounded-full"
              onClick={() => {
                const debt = overview.debts.find((d) => d.id === overview.next_step.debt_id);
                if (debt) openPay(debt);
              }}
            >
              Registrar pagamento do {overview.next_step.title}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TabChips tab={tab} onChange={setTab} />

      {tab === "agora" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
            <Card className="flex h-full flex-col justify-between border-white/10 bg-white/[0.03]">
              <CardContent className="flex h-full flex-col justify-between space-y-4 p-5">
                <div className="space-y-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Resultado do mês
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Caixa disponível (Inter)</p>
                    <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                      {formatBrl(overview.caixa)}
                    </p>
                    {overview.invested > 0 ? (
                      <p className="text-xs tabular-nums text-muted-foreground">
                        em auto-invest {formatBrl(overview.invested)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Entradas (30d)</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {insights ? formatBrl(insights.inflow) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saídas (30d)</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {insights ? formatBrl(insights.outflow) : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col justify-between border-white/10 bg-white/[0.03]">
              <CardContent className="flex h-full flex-col justify-between space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Categorias (30 dias)
                  </p>
                  {insights && insights.outflow > 0 ? (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      Total: {formatBrl(insights.outflow)}
                    </span>
                  ) : null}
                </div>

                {!topCategories.length ? (
                  <div className="flex min-h-[140px] flex-1 items-center justify-center p-4 text-center">
                    <p className="text-sm text-muted-foreground">Sem movimento neste recorte</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {topCategories.map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate text-foreground">{cat.name}</span>
                          <span className="tabular-nums text-muted-foreground">{formatBrl(cat.amount)}</span>
                        </div>
                        <ProgressBar value={cat.amount} max={topCategoriesMax} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <section className="space-y-4">
            <SectionHeading title="Reservas deste mês" kicker="Antes de qualquer cartão" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs text-muted-foreground">Carro</p>
                  <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.reserved_car)}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs text-muted-foreground">Viver</p>
                  <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.reserved_live)}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs text-muted-foreground">Sobrou</p>
                  <p className={cn("text-xl font-semibold tabular-nums", overview.livre < 0 && "text-amber-200")}>
                    {formatBrl(overview.livre)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading title="Contas" kicker="Saldo operacional" />
            <div className="space-y-2">
              {overview.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{acc.name}</p>
                      <SourceChip source={acc.available_source} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {acc.is_operational ? "Conta do dia" : acc.institution}
                      {acc.available_as_of ? ` · ${formatDay(acc.available_as_of)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-semibold tabular-nums">{formatBrl(acc.available)}</p>
                </div>
              ))}
            </div>
          </section>

          {overview.last_sync && Boolean(overview.last_sync.ok) ? (
            <section className="space-y-3">
              <SectionHeading
                title="O banco mostrou"
                kicker={
                  overview.last_sync.finished_at || overview.last_sync.started_at
                    ? `Sync ${formatDay((overview.last_sync.finished_at || overview.last_sync.started_at).slice(0, 10))}`
                    : "Sincronizado"
                }
              />
              <div className="space-y-2">
                {bankEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{entry.name}</p>
                        <Badge variant="outline" className="border-white/10 text-[10px] uppercase text-muted-foreground">
                          {entry.kindLabel}
                        </Badge>
                        <SourceChip source={entry.source} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.kind === "invested" ? "Investimento / auto-invest" : "Saldo em conta"}
                        {entry.asOf ? ` · ${formatDay(entry.asOf)}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums">
                      {formatBrl(entry.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {(overview.installments_n || 0) > 0 ? (
            <section className="space-y-3">
              <SectionHeading title="Compras parceladas" kicker="Já está no cartão — não soma de novo" />
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Ainda resta</p>
                    <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.installments_remaining)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pesa por mês</p>
                    <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.installments_month)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {overview.installments_last ? formatDay(overview.installments_last) : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "dividas" ? (
        <div className="space-y-4">
          <SectionHeading
            title="Fila"
            kicker={`${formatBrl(overview.debts_total)} em aberto`}
          />
          {openDebts.map((debt) => (
            <Card key={debt.id} className="border-white/10 bg-white/[0.03]">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-base font-semibold", debtTone(debt.status, debt.apr_label))}>
                      {debt.title}
                    </p>
                    <Badge variant="outline" className="border-white/10 text-[10px] uppercase">
                      {DEBT_STATUS_LABELS[debt.status] || debt.status}
                    </Badge>
                    {debt.apr_label !== "none" ? (
                      <Badge variant="outline" className="border-amber-400/20 text-[10px] uppercase text-amber-200">
                        {APR_LABELS[debt.apr_label]}
                      </Badge>
                    ) : null}
                    <SourceChip source={debt.source} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {debt.due_date ? `Vence ${formatDay(debt.due_date)}` : "Sem data"}
                    {debt.note ? ` · ${debt.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold tabular-nums">{formatBrl(debt.balance)}</p>
                  <Button type="button" size="sm" className="h-10 rounded-full" onClick={() => openPay(debt)}>
                    Paguei
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {cleanDebts.length ? (
            <p className="text-xs text-muted-foreground">
              Já limpo: {cleanDebts.map((d) => d.title).join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "parcelas" ? (
        <div className="space-y-4">
          <SectionHeading
            title="Já comprado, ainda cai"
            kicker={`${overview.installments_n || 0} em andamento · Pierre 12/08`}
          />
          <p className="text-sm text-muted-foreground">
            Isso já está dentro da fatura do cartão. Não soma em cima dos R$ 10,5 mil.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">Ainda resta</p>
                <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.installments_remaining)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">Pesa / mês</p>
                <p className="text-xl font-semibold tabular-nums">{formatBrl(overview.installments_month)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">Última parcela</p>
                <p className="text-xl font-semibold tabular-nums">
                  {overview.installments_last ? formatDay(overview.installments_last) : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
          {!installments.length ? (
            <PraxisEmptyState
              title="Sem parcela em andamento"
              description="Quando o Pierre ou um print entrar, a lista aparece aqui."
            />
          ) : (
            <div className="space-y-2">
              {installments.map((inst) => {
                const acc = overview.accounts.find((a) => a.id === inst.account_id);
                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{inst.title}</p>
                      <SourceChip source={inst.source} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inst.paid_n}/{inst.total_n}x · {formatBrl(inst.monthly)}/mês
                      {acc ? ` · ${acc.name}` : ""}
                    </p>
                    </div>
                    <p className="shrink-0 tabular-nums font-semibold">{formatBrl(inst.remaining)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "assinaturas" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { title: "Trabalho", items: workSubs, total: overview.work_month },
            { title: "Pessoal", items: personalSubs, total: overview.personal_month },
          ].map((block) => (
            <section key={block.title} className="space-y-3">
              <SectionHeading title={block.title} kicker={formatBrl(block.total)} />
              {block.items.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {LANE_LABELS[sub.lane]} · {SUB_STATUS_LABELS[sub.status] || sub.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="tabular-nums font-semibold">{formatBrl(sub.amount)}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-full text-xs text-muted-foreground"
                      disabled={deleteSubMutation.isPending}
                      onClick={() => deleteSubMutation.mutate(sub.id)}
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      {tab === "extrato" ? (
        <div className="space-y-4">
          <SectionHeading title="Últimos 30 dias" kicker="Saída negativa" />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={txCategory ? "ghost" : "secondary"}
              className="h-9 rounded-full"
              onClick={() => setTxCategory("")}
            >
              Tudo
            </Button>
            {["Dívidas", "Assinaturas", "Alimentação", "Trabalho"].map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={txCategory === cat ? "secondary" : "ghost"}
                className="h-9 rounded-full"
                onClick={() => setTxCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
          {!visibleTx.length ? (
            <PraxisEmptyState
              title="Sem lançamento ainda"
              description="Quando você marcar um pagamento ou o sync entrar, aparece aqui."
            />
          ) : (
            <div className="space-y-2">
              {visibleTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.merchant || tx.raw_description || "Lançamento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(tx.posted_on)} · {tx.category}
                      {tx.direction === "internal" ? " · transferência" : ""}
                    </p>
                  </div>
                  <p className={cn("tabular-nums font-semibold", tx.amount < 0 && "text-amber-100")}>
                    {formatBrl(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "graficos" ? (
        <div className="space-y-6">
          <SectionHeading title="30 dias" kicker={insights ? formatBrl(insights.outflow) : "…"} />
          {!insights || (!insights.categories.length && (!insights.days || !insights.days.length)) ? (
            <PraxisEmptyState
              title="Ainda sem gasto pra desenhar"
              description="Registre um pagamento ou um lançamento que o gráfico aparece."
            />
          ) : (
            <div className="space-y-6">
              {insights.days && insights.days.length > 0 ? (
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Fluxo diário (30 dias)
                    </p>
                    <div className="h-[160px] w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={insights.days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 18%)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(v) => {
                              if (!v || typeof v !== "string") return "";
                              const parts = v.split("-");
                              return parts.length === 3 ? `${parts[2]}/${parts[1]}` : v;
                            }}
                            tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(240 5% 10%)",
                              border: "1px solid hsl(240 4% 18%)",
                              borderRadius: "8px",
                              color: "hsl(0 0% 95%)",
                              fontSize: "12px",
                            }}
                            formatter={(value) => [formatBrl(value), "Saída"]}
                            labelFormatter={(label) => formatDay(label)}
                          />
                          <Bar
                            dataKey="amount"
                            fill="hsl(38 85% 52%)"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {insights.categories && insights.categories.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Por categoria
                  </p>
                  {insights.categories.map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">{formatBrl(cat.amount)}</span>
                      </div>
                      <ProgressBar value={cat.amount} max={maxCat} />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Cartão {formatBrl(insights.card_outflow)} · conta {formatBrl(insights.cash_outflow)}. Transferência interna não entra.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "metas" ? (
        <div className="space-y-4">
          <SectionHeading title="Alvos" kicker="Um monstro por vez" />
          {!goals.length ? (
            <PraxisEmptyState title="Sem meta financeira" description="A seed cria carro, MP e óculos." />
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBrl(goal.current_amount)} de {formatBrl(goal.target_amount)}
                        {goal.due_date ? ` · ${formatDay(goal.due_date)}` : ""}
                      </p>
                    </div>
                    <SourceChip label={goal.status === "done" ? "feito" : `${goal.progress}%`} />
                  </div>
                  <ProgressBar value={goal.current_amount} max={goal.target_amount} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      <Dialog open={Boolean(payDebt)} onOpenChange={(open) => !open && setPayDebt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso não paga no banco. Só baixa a fila aqui quando o Pix já saiu.
          </p>
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Valor</span>
            <Input
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="tabular-nums"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setPayDebt(null)}>
              Cancelar
            </Button>
            <Button type="button" className="rounded-full" disabled={payMutation.isPending} onClick={submitPay}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={caixaOpen} onOpenChange={setCaixaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Saldo do Inter agora</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">O que o app mostra hoje. Esse número trava por cima da foto antiga.</p>
          <Input
            inputMode="decimal"
            value={caixaAmount}
            onChange={(e) => setCaixaAmount(e.target.value)}
            className="tabular-nums"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setCaixaOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={caixaMutation.isPending}
              onClick={() => caixaMutation.mutate(Number(String(caixaAmount).replace(",", ".")))}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
