import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { MEAL_SLOT_LABELS, formatKcal, formatGrams } from '@/lib/nutrition';

export default function DiaryMealCard({ slotKey, logs = [], totals, onAddClick, onDeleteLog }) {
  const label = MEAL_SLOT_LABELS[slotKey] || slotKey;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="font-semibold text-base">{label}</h3>
            {totals && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatKcal(totals.kcal)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddClick(slotKey)}
            className="h-8 px-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">Nenhum alimento registrado</p>
        ) : (
          <div className="space-y-2 divide-y divide-border/40">
            {logs.map((log) => (
              <div key={log.id} className="pt-2 first:pt-0 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{log.food_name || 'Alimento'}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {log.servings ? `${log.servings}x ` : ''}
                    {formatKcal(log.kcal)} • P: {formatGrams(log.protein_g)} C: {formatGrams(log.carbs_g)} F: {formatGrams(log.fat_g)}
                  </p>
                </div>
                {onDeleteLog && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteLog(log.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
