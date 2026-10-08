import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Target, X } from 'lucide-react';
import { PraxisInlinePromo } from '@/components/layout/PraxisPage';
import {
  GOAL_STARTER_TEMPLATES,
  isGoalSuggestDismissed,
  dismissGoalSuggest,
} from '@/lib/goalStarterTemplates';

export default function SuggestedGoalCard() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => isGoalSuggestDismissed());

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => praxisApi.goals.list(),
    staleTime: 120_000,
  });

  const activeCount = goals.filter((g) => g.status === 'active').length;
  if (dismissed || activeCount > 0) return null;

  const handlePick = (id) => {
    navigate(`/metas?starter=${id}`);
  };

  const handleDismiss = () => {
    dismissGoalSuggest();
    setDismissed(true);
  };

  return (
    <PraxisInlinePromo
      icon={Target}
      iconClassName="text-primary/80"
      title="Criar sua primeira meta"
      subtitle="Atalhos para RCA, Encarte ou corpo. Depois você ajusta em Metas."
      trailing={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDismiss}
          aria-label="Agora não"
        >
          <X className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {GOAL_STARTER_TEMPLATES.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handlePick(t.id)}
          >
            {t.emoji} {t.label}
          </Button>
        ))}
      </div>
    </PraxisInlinePromo>
  );
}