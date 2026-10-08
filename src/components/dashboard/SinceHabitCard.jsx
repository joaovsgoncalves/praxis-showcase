import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock3, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  elapsedSinceFortalezaMidnight,
  formatSinceDatePt,
  sinceMilestone,
} from "@/lib/habits";
import { cn } from "@/lib/utils";

const CLOCK_PARTS = [
  ["days", "D"],
  ["hours", "H"],
  ["minutes", "M"],
  ["seconds", "S"],
];

export default function SinceHabitCard({
  habit,
  onEdit,
  trailing,
  compact = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const elapsed = useMemo(
    () => elapsedSinceFortalezaMidnight(habit?.since_date, now),
    [habit?.since_date, now],
  );
  const milestone = habit?.since_line
    ? { phase: habit.since_phase, line: habit.since_line }
    : sinceMilestone(elapsed.days);

  if (!habit) return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-domain-gold/20 bg-card/60 p-3.5 transition-colors hover:border-domain-gold/35 hover:bg-card/80",
          compact && "p-2.5 sm:p-3",
          className,
        )}
      >
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Abrir relógio de ${habit.title}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-domain-gold/10 text-domain-gold">
            <Clock3 className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold sm:text-[15px]">
              {habit.title || "Sem pornografia"}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-domain-gold">
              Limpo
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>

        {onEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={`Editar hábito ${habit.title}`}
            onClick={() => onEdit(habit)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {trailing}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl overflow-hidden border-domain-gold/20 bg-background/95 p-5 sm:p-7">
          <DialogHeader className="pr-7 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-domain-gold">
              Limpo. Sem volta.
            </p>
            <DialogTitle className="praxis-title text-2xl tracking-[-0.035em]">
              {habit.title || "Sem pornografia"}
            </DialogTitle>
            <DialogDescription>{formatSinceDatePt(habit.since_date)}</DialogDescription>
          </DialogHeader>

          <div
            className="grid grid-cols-4 gap-2 sm:gap-3"
            aria-label={`${elapsed.days} dias, ${elapsed.hours} horas, ${elapsed.minutes} minutos e ${elapsed.seconds} segundos`}
          >
            {CLOCK_PARTS.map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-1.5 py-3 text-center sm:px-3 sm:py-4"
              >
                <span className="block text-2xl font-bold tabular-nums tracking-[-0.05em] text-foreground sm:text-4xl">
                  {key === "days" ? elapsed[key] : String(elapsed[key]).padStart(2, "0")}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-muted-foreground sm:text-xs">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-domain-gold/15 bg-domain-gold/[0.045] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-muted-foreground">Fase</span>
              <span className="text-xs font-semibold text-domain-gold">
                {habit.since_phase || milestone.phase}
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/90">
              {habit.since_line || milestone.line}
            </p>
            <p className="border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-muted-foreground">
              Prova: Você já segurou isso do fim de 2022 a 2025.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
