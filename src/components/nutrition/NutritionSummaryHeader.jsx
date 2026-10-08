import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import MacroBars from '@/components/nutrition/MacroBars';

export default function NutritionSummaryHeader({ totals, target, dayData }) {
  if (!totals) return null;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-5">
        <MacroBars totals={totals} target={target} dayData={dayData} />
      </CardContent>
    </Card>
  );
}
