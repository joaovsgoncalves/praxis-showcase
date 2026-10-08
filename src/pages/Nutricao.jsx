import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import {
  PageHero,
  PraxisEmptyState,
  PraxisListSkeleton,
} from '@/components/layout/PraxisPage';
import NutritionMetaForm from '@/components/nutrition/NutritionMetaForm';
import NutritionOnboarding from '@/components/nutrition/NutritionOnboarding';
import NutritionWaterPanel from '@/components/nutrition/NutritionWaterPanel';
import useFortalezaToday from '@/hooks/useFortalezaToday';
import FoodCatalog from '@/components/nutrition/FoodCatalog';
import MealsCatalog from '@/components/nutrition/MealsCatalog';
import DayDiary from '@/components/nutrition/DayDiary';
import NutritionHistory from '@/components/nutrition/NutritionHistory';
import WeightTracker from '@/components/nutrition/WeightTracker';
import RegimenDay from '@/components/nutrition/RegimenDay';
import RegimenCatalog from '@/components/nutrition/RegimenCatalog';
import MacroBars from '@/components/nutrition/MacroBars';
import { formatKcal, GOAL_LABELS } from '@/lib/nutrition';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** ≤4 tabs sem scroll em 390px — secundários em Mais */
const PRIMARY_TABS = [
  { id: 'diario', label: 'Diário' },
  { id: 'historico', label: 'Histórico' },
  { id: 'peso', label: 'Peso' },
  { id: 'mais', label: 'Mais' },
];

const MAIS_PANELS = [
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'refeicoes', label: 'Refeições' },
  { id: 'rotina', label: 'Rotina' },
  { id: 'meta', label: 'Meta' },
];

function needsOnboarding(profile) {
  if (!profile) return false;
  if (profile.onboarding_done === 1 || profile.onboarding_done === true) return false;
  return profile.target_kcal == null;
}

export default function Nutricao() {
  const { pathname } = useLocation();
  const inJotaFit = pathname.startsWith('/jota-fit');
  const [tab, setTab] = useState('diario');
  const [maisPanel, setMaisPanel] = useState('alimentos');
  const [diaryDate, setDiaryDate] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const today = useFortalezaToday();

  const {
    data: profile,
    isLoading: loadingProfile,
    isError: profileError,
  } = useQuery({
    queryKey: ['nutrition', 'profile'],
    queryFn: () => praxisApi.nutrition.profile(),
    retry: 1,
  });

  const dayKey = diaryDate || today;
  const { data: day, isLoading: loadingDay } = useQuery({
    queryKey: ['nutrition', 'day', dayKey],
    queryFn: () => praxisApi.nutrition.day(dayKey),
    retry: 1,
  });

  const showOnboarding =
    !loadingProfile && !profileError && !onboardingDismissed && needsOnboarding(profile);

  const goalLabel = GOAL_LABELS[profile?.goal] || 'Manter';
  const hasTargets = profile?.target_kcal != null;
  const totals = day?.totals || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const targets = {
    kcal: profile?.target_kcal ?? day?.targets?.kcal ?? null,
    protein_g: profile?.target_protein_g ?? day?.targets?.protein_g ?? null,
    carbs_g: profile?.target_carbs_g ?? day?.targets?.carbs_g ?? null,
    fat_g: profile?.target_fat_g ?? day?.targets?.fat_g ?? null,
  };

  // Diário já tem o único bloco de macros (com “faltam”); sem duplicar no topo
  const showPageMacros =
    !showOnboarding &&
    tab !== 'diario' &&
    tab !== 'historico' &&
    tab !== 'peso' &&
    (hasTargets || (totals.kcal ?? 0) > 0);

  return (
    <div className="praxis-page space-y-6 pb-24">
      {inJotaFit ? null : (
        <PageHero
          kicker="Ferramentas"
          title="Nutrição"
          description="Loga a refeição em poucos toques — diário, rotina e peso."
        />
      )}

      {showOnboarding ? (
        <NutritionOnboarding
          profile={profile}
          onDone={() => setOnboardingDismissed(true)}
        />
      ) : null}

      {showPageMacros ? (
        <Card className="border-border/80 bg-card/40 shadow-none">
          <CardContent className="px-5 py-4 space-y-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {hasTargets ? `Meta · ${goalLabel}` : 'Consumido hoje'}
              </p>
              <p className="text-lg font-semibold tabular-nums tracking-tight">
                {formatKcal(totals.kcal ?? 0)}
                {hasTargets ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    / {formatKcal(targets.kcal)}
                  </span>
                ) : null}
              </p>
            </div>
            <MacroBars totals={totals} targets={targets} variant="full" />
          </CardContent>
        </Card>
      ) : null}

      {!showOnboarding && (
        <>
          <div
            className="grid grid-cols-4 gap-1 rounded-full bg-secondary/40 p-1"
            role="tablist"
            aria-label="Seções de nutrição"
          >
            {PRIMARY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`nutri-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`nutri-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-1 py-2.5 text-xs sm:text-sm font-medium transition-colors',
                  'min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === t.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            id={`nutri-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`nutri-tab-${tab}`}
            className="space-y-4"
          >
            {tab === 'diario' ? (
              <>
                {loadingDay && !day ? (
                  <PraxisListSkeleton rows={3} />
                ) : (
                  <DayDiary date={dayKey} onDateChange={(date) => setDiaryDate(date === today ? null : date)} />
                )}
                <div className="grid gap-4 lg:grid-cols-2 lg:items-start" aria-label="Hidratação e rotina">
                  <NutritionWaterPanel key={dayKey} date={dayKey} />
                  <RegimenDay date={dayKey} />
                </div>
              </>
            ) : null}

            {tab === 'historico' ? (
              <NutritionHistory
                onOpenDay={(d) => {
                  setDiaryDate(d);
                  setTab('diario');
                }}
              />
            ) : null}

            {tab === 'peso' ? <WeightTracker /> : null}

            {tab === 'mais' ? (
              <>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mais ferramentas">
                  {MAIS_PANELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMaisPanel(p.id)}
                      className={cn(
                        'rounded-full px-3 py-2 text-xs font-medium min-h-10 border transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        maisPanel === p.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {maisPanel === 'alimentos' ? <FoodCatalog /> : null}
                {maisPanel === 'refeicoes' ? <MealsCatalog /> : null}
                {maisPanel === 'rotina' ? <RegimenCatalog /> : null}
                {maisPanel === 'meta' ? (
                  loadingProfile ? (
                    <PraxisListSkeleton rows={2} />
                  ) : profileError ? (
                    <PraxisEmptyState
                      title="Não carregou o perfil"
                      description="A API de nutrição não respondeu. Tenta de novo ou confere se está logado."
                    />
                  ) : (
                    <NutritionMetaForm profile={profile} />
                  )
                ) : null}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
