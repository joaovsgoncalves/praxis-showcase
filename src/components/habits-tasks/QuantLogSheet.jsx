import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

export default function QuantLogSheet({
  open,
  onOpenChange,
  habit,
  currentValue,
  busy = false,
  onConfirm,
}) {
  const [value, setValue] = useState('1');

  useEffect(() => {
    if (open) {
      const num = Number(currentValue);
      const initial = Number.isFinite(num) && num > 0 ? num : 1;
      setValue(String(initial));
    }
  }, [open, habit?.id, currentValue]);

  const handleStep = (delta) => {
    const currentNum = Number(value);
    const base = Number.isFinite(currentNum) ? currentNum : 0;
    const step = habit?.quick_increment != null && Number(habit.quick_increment) > 0
      ? Number(habit.quick_increment)
      : 1;
    const next = Math.max(0, Math.round((base + delta * step) * 1000) / 1000);
    setValue(String(next));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;
    onConfirm?.(num);
  };

  const parsed = Number(value);
  const isValid = Number.isFinite(parsed) && parsed >= 0;
  const target = habit?.target_value != null ? Number(habit.target_value) : null;
  const unit = habit?.unit ? String(habit.unit).trim() : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl border-white/10 bg-card p-6 sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-foreground">
              {habit?.title || 'Hábito'}
            </DialogTitle>
            {target != null ? (
              <DialogDescription className="text-xs text-muted-foreground">
                meta: {target}{unit ? ` ${unit}` : ''}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="my-6 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 min-h-[44px] min-w-[44px] rounded-full border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:text-foreground touch-manipulation"
              aria-label="Diminuir quantidade"
              disabled={busy || !isValid || parsed <= 0}
              onClick={() => handleStep(-1)}
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={busy}
                  className="w-24 bg-transparent text-center text-5xl font-bold tabular-nums text-foreground outline-none focus:ring-0 sm:w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Quantidade registrada"
                  autoFocus
                />
                {unit ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    {unit}
                  </span>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 min-h-[44px] min-w-[44px] rounded-full border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:text-foreground touch-manipulation"
              aria-label="Aumentar quantidade"
              disabled={busy}
              onClick={() => handleStep(1)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] rounded-full border-white/10 px-4 hover:bg-white/[0.04] touch-manipulation"
              disabled={busy}
              onClick={() => onOpenChange?.(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-[44px] rounded-full bg-domain-gold px-5 font-semibold text-slate-950 hover:bg-domain-gold/90 touch-manipulation"
              disabled={busy || !isValid}
            >
              {busy ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
