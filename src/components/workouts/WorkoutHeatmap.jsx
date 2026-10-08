import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, X } from "lucide-react";
import { praxisApi } from "@/api/praxisClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildYearHeatmapGrid,
  formatHeatmapTooltip,
  HEATMAP_INTENSITY_BINS,
} from "@/lib/workoutV4";

const WEEK_LABELS = ["", "Seg", "", "Qua", "", "Sex", ""];

// Praxis Dark + Gold intensity buckets for work sets (not GitHub green)
const BUCKET_BG_CLASSES = [
  "bg-secondary/40 border border-border/35",
  "bg-primary/25 border border-primary/30",
  "bg-primary/50 border border-primary/45",
  "bg-primary/75 border border-primary/65 text-primary-foreground",
  "bg-primary border border-primary/90 text-primary-foreground shadow-sm shadow-primary/25",
];

export default function WorkoutHeatmap({ selectedDate, onSelectDate, fallbackDays = [] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: heatmapData, isLoading, isError } = useQuery({
    queryKey: ["workouts", "heatmap", year],
    queryFn: () => praxisApi.workouts.heatmap({ year }),
    staleTime: 30_000,
  });

  const daysData = (heatmapData?.days && heatmapData.days.length)
    ? heatmapData.days
    : fallbackDays;

  const grid = useMemo(() => {
    return buildYearHeatmapGrid(year, daysData);
  }, [year, daysData]);

  const {
    weeks,
    monthLabels,
    totalSessions,
    totalWorkSets,
    activeDaysCount,
  } = grid;

  const handlePrevYear = () => setYear((y) => Math.max(2000, y - 1));
  const handleNextYear = () => setYear((y) => Math.min(2100, y + 1));

  return (
    <Card className="border-border/70 bg-card/35 rounded-2xl shadow-none">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">
                Consistência no ano
              </CardTitle>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  <strong className="font-semibold text-foreground tabular-nums">
                    {totalSessions}
                  </strong>{" "}
                  {totalSessions === 1 ? "treino" : "treinos"}
                </span>
                <span>·</span>
                <span>
                  <strong className="font-semibold text-foreground tabular-nums">
                    {totalWorkSets}
                  </strong>{" "}
                  séries de trabalho
                </span>
                <span>·</span>
                <span>
                  <strong className="font-semibold text-foreground tabular-nums">
                    {activeDaysCount}
                  </strong>{" "}
                  {activeDaysCount === 1 ? "dia ativo" : "dias ativos"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handlePrevYear}
              title="Ano anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[44px] text-center text-xs font-semibold tabular-nums text-foreground">
              {year}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleNextYear}
              title="Próximo ano"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="overflow-x-auto -mx-1 px-1 praxis-hide-scrollbar praxis-scroll-x">
          <div className="min-w-[690px] pt-1">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-1.5 ml-7">
              {weeks.map((_, colIdx) => {
                const labelObj = monthLabels.find((m) => m.colIndex === colIdx);
                return (
                  <div
                    key={colIdx}
                    className="w-3.5 text-[9px] font-medium text-muted-foreground/70 capitalize"
                  >
                    {labelObj ? labelObj.label : ""}
                  </div>
                );
              })}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-[3px]">
              {/* Weekday labels */}
              <div className="flex flex-col gap-[3px] mr-1.5">
                {WEEK_LABELS.map((l, i) => (
                  <div
                    key={i}
                    className="w-5 h-3.5 text-[9px] font-medium text-muted-foreground/60 leading-[14px]"
                  >
                    {l}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              {weeks.map((week, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[3px]">
                  {week.map((cell) => {
                    if (!cell.inYear) {
                      return (
                        <div
                          key={cell.dateStr}
                          className="w-3.5 h-3.5 opacity-0 pointer-events-none"
                        />
                      );
                    }

                    const isSelected = selectedDate === cell.dateStr;
                    const tooltipText = formatHeatmapTooltip(cell);

                    if (cell.future) {
                      return (
                        <div
                          key={cell.dateStr}
                          title={tooltipText}
                          className="w-3.5 h-3.5 rounded-[3px] border border-dashed border-border/30 bg-transparent opacity-30 cursor-default"
                        />
                      );
                    }

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() =>
                          onSelectDate?.(isSelected ? null : cell.dateStr)
                        }
                        title={tooltipText}
                        className={cn(
                          "w-3.5 h-3.5 rounded-[3px] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          BUCKET_BG_CLASSES[cell.bin],
                          "hover:scale-125 hover:z-10 hover:ring-1 hover:ring-primary/60",
                          isSelected &&
                            "ring-2 ring-primary ring-offset-1 ring-offset-background scale-125 z-10 shadow-sm"
                        )}
                        aria-label={tooltipText}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bottom bar: Legend + active filter indicator */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground/70 border-t border-border/40 pt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">Menos</span>
                {BUCKET_BG_CLASSES.map((bgClass, idx) => (
                  <div
                    key={idx}
                    title={HEATMAP_INTENSITY_BINS[idx]?.label}
                    className={cn(
                      "w-3 h-3 rounded-[2.5px]",
                      bgClass
                    )}
                  />
                ))}
                <span className="text-[10px]">Mais</span>
              </div>

              {selectedDate ? (
                <div className="flex items-center gap-1.5 text-xs text-foreground bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                  <span className="text-[11px]">
                    Filtro:{" "}
                    <strong>
                      {selectedDate.split("-").reverse().join("/")}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectDate?.(null)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center"
                    title="Limpar filtro"
                  >
                    <X className="h-3.5 w-3.5 ml-0.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
