import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';
import { PraxisInlinePromo } from '@/components/layout/PraxisPage';

function shouldShowPrompt(today, lastReviewWeekStart) {
  const dow = today.getDay();
  if (dow !== 0 && dow !== 1) return false;

  const monday = new Date(today);
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);
  const previousMonday = new Date(monday);
  previousMonday.setDate(previousMonday.getDate() - 7);
  const previousMondayStr = previousMonday.toISOString().split('T')[0];

  return lastReviewWeekStart !== previousMondayStr;
}

export default function WeeklyReviewPrompt() {
  const { data, isLoading } = useQuery({
    queryKey: ['weeklyReviewHistory', 1],
    queryFn: () => praxisApi.weeklyReviews.list(1),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;

  const lastReviewWeekStart = data?.[0]?.week_start || null;
  if (!shouldShowPrompt(new Date(), lastReviewWeekStart)) return null;

  return (
    <PraxisInlinePromo
      icon={BookOpen}
      iconClassName="text-primary/80"
      title="Revisão da semana passada"
      subtitle="5 minutos pra olhar pra trás antes de seguir."
      trailing={
        <Button asChild size="sm" variant="outline">
          <Link to="/revisao-semanal">
            Revisar <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      }
    />
  );
}