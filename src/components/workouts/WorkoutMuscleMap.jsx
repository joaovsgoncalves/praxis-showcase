import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Dumbbell,
  Flame,
  Info,
  RotateCcw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { praxisApi } from "@/api/praxisClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PraxisEmptyState, PraxisListSkeleton } from "@/components/layout/PraxisPage";
import { cn } from "@/lib/utils";
import { MUSCLE_LABEL_PT } from "@/lib/workoutV4";

/**
 * Returns color hex and tailwind classes based on score (0 to 1) and active mode.
 * - balance: Praxis Amber / Gold scale
 * - fatigue: Ember / Warm Orange scale
 * - strength: Pure Gold scale
 */
function getMuscleColor(score, mode = "balance") {
  if (!score || score <= 0) {
    return {
      fill: "#181b20",
      stroke: "rgba(255, 255, 255, 0.14)",
      textClass: "text-muted-foreground",
      badgeClass: "bg-secondary/60 text-muted-foreground border-transparent",
      label:
        mode === "fatigue"
          ? "Recuperado"
          : mode === "strength"
            ? "Sem registro"
            : "Sem estímulo",
    };
  }

  if (mode === "fatigue") {
    if (score < 0.35) {
      return {
        fill: "#7c2d12", // orange-900 / ember dark
        stroke: "rgba(234, 88, 12, 0.45)",
        textClass: "text-orange-400",
        badgeClass: "bg-orange-950/50 text-orange-400 border-orange-800/40",
        label: "Fadiga leve",
      };
    }
    if (score < 0.70) {
      return {
        fill: "#c2410c", // orange-700 / ember mid
        stroke: "rgba(234, 88, 12, 0.75)",
        textClass: "text-orange-300",
        badgeClass: "bg-orange-900/60 text-orange-300 border-orange-700/50",
        label: "Fadiga moderada",
      };
    }
    return {
      fill: "#ea580c", // orange-600 / ember bright
      stroke: "#fb923c",
      textClass: "text-orange-300 font-semibold",
      badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold",
      label: "Fadiga acumulada",
    };
  }

  if (mode === "strength") {
    if (score < 0.35) {
      return {
        fill: "#854d0e", // yellow-800
        stroke: "rgba(234, 179, 8, 0.45)",
        textClass: "text-yellow-500",
        badgeClass: "bg-yellow-950/50 text-yellow-400 border-yellow-800/40",
        label: "Carga inicial",
      };
    }
    if (score < 0.70) {
      return {
        fill: "#ca8a04", // yellow-600
        stroke: "rgba(234, 179, 8, 0.75)",
        textClass: "text-yellow-400",
        badgeClass: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
        label: "Força moderada",
      };
    }
    return {
      fill: "#eab308", // yellow-500 / gold
      stroke: "#fde047",
      textClass: "text-yellow-300 font-semibold",
      badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-semibold",
      label: "Pico de 1RM",
    };
  }

  // Default: Balance mode
  if (score < 0.35) {
    return {
      fill: "#92400e", // amber-800
      stroke: "rgba(245, 158, 11, 0.45)",
      textClass: "text-amber-500",
      badgeClass: "bg-amber-950/50 text-amber-400 border-amber-800/40",
      label: "Baixo volume",
    };
  }
  if (score < 0.70) {
    return {
      fill: "#d97706", // amber-600
      stroke: "rgba(245, 158, 11, 0.75)",
      textClass: "text-amber-400",
      badgeClass: "bg-amber-900/60 text-amber-300 border-amber-700/50",
      label: "Volume moderado",
    };
  }
  return {
    fill: "#f59e0b", // amber-500 gold
    stroke: "#fbbf24",
    textClass: "text-amber-300 font-semibold",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold",
    label: "Foco principal",
  };
}

function formatMuscleValue(raw, mode) {
  const val = raw || 0;
  if (val === 0) {
    if (mode === "strength") return "0 kg";
    if (mode === "fatigue") return "0 residual";
    return "0 séries";
  }
  if (mode === "strength") {
    return `${Number(val).toLocaleString("pt-BR")} kg`;
  }
  if (mode === "fatigue") {
    return `${Number(val).toLocaleString("pt-BR")} residual`;
  }
  return `${Number(val).toLocaleString("pt-BR")} séries`;
}

const DAY_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 28, label: "28 dias" },
];

const MODES = [
  { id: "balance", label: "Balanço", enabled: true },
  { id: "fatigue", label: "Fadiga", enabled: true },
  { id: "strength", label: "Força", enabled: true },
];

export default function WorkoutMuscleMap({ onNavigateToLibrary, onNavigateToProgram }) {
  const [days, setDays] = useState(14);
  const [mode, setMode] = useState("balance");
  const [view, setView] = useState("front"); // "front" | "back"
  const [selectedMuscleId, setSelectedMuscleId] = useState(null);

  const { data: mapData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["workouts", "muscle-map", mode, days],
    queryFn: () => praxisApi.workouts.muscleMap({ mode, days }),
    staleTime: 30_000,
  });

  const muscleMap = useMemo(() => {
    const map = {};
    if (mapData?.muscles) {
      for (const m of mapData.muscles) {
        map[m.id] = m;
      }
    }
    return map;
  }, [mapData]);

  const totalVolume = useMemo(() => {
    if (!mapData?.muscles) return 0;
    const sum = mapData.muscles.reduce((acc, m) => acc + (m.raw || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [mapData]);

  const activeMusclesCount = useMemo(() => {
    if (!mapData?.muscles) return 0;
    return mapData.muscles.filter((m) => m.raw > 0).length;
  }, [mapData]);

  const topMuscle = useMemo(() => {
    if (!mapData?.muscles || activeMusclesCount === 0) return null;
    const sorted = [...mapData.muscles].sort((a, b) => b.raw - a.raw);
    return sorted[0]?.raw > 0 ? sorted[0] : null;
  }, [mapData, activeMusclesCount]);

  const selectedMuscle = selectedMuscleId
    ? muscleMap[selectedMuscleId] || {
        id: selectedMuscleId,
        label: MUSCLE_LABEL_PT[selectedMuscleId] || selectedMuscleId,
        score: 0,
        raw: 0,
        unit: mode === "strength" ? "kg" : "sets",
      }
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PraxisListSkeleton rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <PraxisEmptyState
        icon={Activity}
        title="Não foi possível carregar o mapa muscular"
        description={error?.message || "Tente recarregar em alguns instantes."}
        action={
          <Button type="button" variant="outline" className="rounded-full" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        }
      />
    );
  }

  const hasAnyData = mode === "strength" ? (topMuscle?.raw > 0) : (totalVolume > 0);

  return (
    <div className="space-y-6">
      {/* Header controls: Modes & Day segmented controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Mode Selector */}
        <div className="inline-flex rounded-full bg-secondary/40 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.enabled && setMode(m.id)}
              disabled={!m.enabled}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m.id
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : m.enabled
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50 cursor-not-allowed",
              )}
            >
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Days Window Selector */}
        <div className="inline-flex rounded-full bg-secondary/40 p-1 self-start sm:self-auto">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                days === opt.value
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="border-border/60 bg-card/30">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              {mode === "fatigue"
                ? "Fadiga residual"
                : mode === "strength"
                  ? "Maior 1RM"
                  : "Volume total"}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">
              {mode === "strength" ? (topMuscle ? topMuscle.raw : 0) : totalVolume}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {mode === "strength" ? "kg" : mode === "fatigue" ? "residual" : "séries eq."}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/30">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              {mode === "fatigue"
                ? "Mais fadigado"
                : mode === "strength"
                  ? "Músculo mais forte"
                  : "Mais treinado"}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-amber-400 sm:text-lg">
              {topMuscle ? topMuscle.label : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {topMuscle ? formatMuscleValue(topMuscle.raw, mode) : "nenhum"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/30">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              {mode === "fatigue"
                ? "Músculos fadigados"
                : mode === "strength"
                  ? "Músculos aferidos"
                  : "Cobertura"}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">
              {activeMusclesCount}
              <span className="text-xs font-normal text-muted-foreground"> / 18</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {mode === "fatigue"
                ? "com desgaste recente"
                : mode === "strength"
                  ? "com carga registrada"
                  : "músculos ativos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Body Map Visualizer Card */}
      <Card className="border-border/60 bg-card/25 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Distribuição Anatômica</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "fatigue"
                  ? `Estimativa de fadiga residual com decaimento exponencial nos últimos ${days} dias`
                  : mode === "strength"
                    ? `Estimativa de 1RM máximo (Epley) por grupo muscular nos últimos ${days} dias`
                    : `Intensidade de séries concluídas nos últimos ${days} dias`}
              </p>
            </div>

            {/* Front / Back Toggle */}
            <div className="inline-flex rounded-full bg-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setView("front")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  view === "front"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Frente
              </button>
              <button
                type="button"
                onClick={() => setView("back")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  view === "back"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Costas
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Main layout: SVG Diagram + Selected Muscle Inspector */}
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
            {/* SVG Body Diagram Container */}
            <div className="relative flex flex-col items-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[1/2] rounded-2xl bg-black/40 p-4 border border-border/40 shadow-inner flex items-center justify-center">
                {view === "front" ? (
                  <FrontBodySvg
                    muscleMap={muscleMap}
                    selectedId={selectedMuscleId}
                    onSelectMuscle={(id) => setSelectedMuscleId(id === selectedMuscleId ? null : id)}
                    mode={mode}
                  />
                ) : (
                  <BackBodySvg
                    muscleMap={muscleMap}
                    selectedId={selectedMuscleId}
                    onSelectMuscle={(id) => setSelectedMuscleId(id === selectedMuscleId ? null : id)}
                    mode={mode}
                  />
                )}
              </div>

              {/* View Switch Indicator Button */}
              <button
                type="button"
                onClick={() => setView((v) => (v === "front" ? "back" : "front"))}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Ver {view === "front" ? "Costas" : "Frente"}</span>
              </button>
            </div>

            {/* Selected Muscle Detail & Legend */}
            <div className="w-full flex-1 max-w-sm space-y-4">
              {/* Selected Muscle Card */}
              {selectedMuscle ? (
                <Card className="border-primary/40 bg-primary/10 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className={getMuscleColor(selectedMuscle.score, mode).badgeClass}>
                          {getMuscleColor(selectedMuscle.score, mode).label}
                        </Badge>
                        <h4 className="mt-1 text-base font-bold text-foreground">
                          {selectedMuscle.label}
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedMuscleId(null)}
                      >
                        ✕
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {mode === "fatigue"
                            ? "Fadiga residual"
                            : mode === "strength"
                              ? "Melhor 1RM estimado"
                              : "Volume equivalente"}
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatMuscleValue(selectedMuscle.raw, mode)}
                        </span>
                      </div>
                      <Progress
                        value={Math.round(selectedMuscle.score * 100)}
                        className="h-2 bg-secondary/80"
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          {mode === "fatigue"
                            ? "Nível de fadiga residual"
                            : mode === "strength"
                              ? "Força relativa ao ápice"
                              : "Intensidade relativa"}
                        </span>
                        <span className="tabular-nums font-medium text-amber-400">
                          {Math.round(selectedMuscle.score * 100)}%
                        </span>
                      </div>
                    </div>

                    {onNavigateToLibrary ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-full text-xs font-medium"
                        onClick={() => onNavigateToLibrary(selectedMuscle.id)}
                      >
                        <Dumbbell className="mr-1.5 h-3.5 w-3.5" />
                        Ver exercícios na Biblioteca
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                  <Info className="mx-auto h-5 w-5 text-muted-foreground/70" />
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    Toque em qualquer músculo na silhueta para inspecionar métricas e detalhes.
                  </p>
                </div>
              )}

              {/* Heatmap Legend */}
              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  {mode === "fatigue"
                    ? "Escala de Fadiga"
                    : mode === "strength"
                      ? "Escala de Força (1RM)"
                      : "Escala de Volume"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#181b20] border border-border/80" />
                    <span className="text-muted-foreground">
                      {mode === "fatigue"
                        ? "0% · Recuperado"
                        : mode === "strength"
                          ? "0% · Sem carga"
                          : "0% · Sem treino"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          mode === "fatigue" ? "#7c2d12" : mode === "strength" ? "#854d0e" : "#92400e",
                      }}
                    />
                    <span className="text-muted-foreground">
                      {mode === "fatigue"
                        ? "1–34% · Leve"
                        : mode === "strength"
                          ? "1–34% · Inicial"
                          : "1–34% · Baixo"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          mode === "fatigue" ? "#c2410c" : mode === "strength" ? "#ca8a04" : "#d97706",
                      }}
                    />
                    <span className="text-muted-foreground">
                      {mode === "fatigue"
                        ? "35–69% · Moderada"
                        : mode === "strength"
                          ? "35–69% · Moderada"
                          : "35–69% · Médio"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          mode === "fatigue" ? "#ea580c" : mode === "strength" ? "#eab308" : "#f59e0b",
                      }}
                    />
                    <span className="text-muted-foreground">
                      {mode === "fatigue"
                        ? "70–100% · Alta"
                        : mode === "strength"
                          ? "70–100% · Ápice"
                          : "70–100% · Alto"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State Banner when no sessions found */}
      {!hasAnyData ? (
        <PraxisEmptyState
          icon={Dumbbell}
          title={
            mode === "fatigue"
              ? "Nenhuma fadiga residual no período"
              : mode === "strength"
                ? "Nenhum registro de carga no período"
                : "Nenhum treino no período selecionado"
          }
          description={
            mode === "fatigue"
              ? "Todos os grupos musculares estão totalmente recuperados ou não há sessões concluídas no período."
              : mode === "strength"
                ? "Registre séries com carga (kg) e repetições para visualizar o mapa de 1RM e força muscular."
                : "Registre ou complete uma sessão de treino para visualizar o equilíbrio muscular e quais grupos precisam de estímulo."
          }
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              {onNavigateToLibrary ? (
                <Button type="button" variant="default" className="rounded-full" onClick={() => onNavigateToLibrary()}>
                  Explorar Biblioteca
                </Button>
              ) : null}
              {onNavigateToProgram ? (
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onNavigateToProgram()}>
                  Ver Programa
                </Button>
              ) : null}
            </div>
          }
        />
      ) : null}

      {/* Ranked Lists: Mais Estimulados / Fadigados / Fortes & Precisam de Atenção / Recuperados */}
      {hasAnyData ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Top Muscles List */}
          <Card className="border-border/60 bg-card/25">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                {mode === "fatigue" ? (
                  <Zap className="h-4 w-4 text-orange-500" />
                ) : mode === "strength" ? (
                  <Dumbbell className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Flame className="h-4 w-4 text-amber-500" />
                )}
                <CardTitle className="text-sm font-semibold">
                  {mode === "fatigue"
                    ? "Maior Fadiga Residual"
                    : mode === "strength"
                      ? "Maiores Cargas (1RM)"
                      : "Mais Estimulados"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {mapData?.ranked?.most?.length > 0 ? (
                mapData.ranked.most.slice(0, 6).map((id) => {
                  const item = muscleMap[id];
                  if (!item) return null;
                  const isSelected = selectedMuscleId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedMuscleId(isSelected ? null : id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-primary/20 border border-primary/40 font-semibold"
                          : "bg-secondary/30 hover:bg-secondary/60 border border-transparent",
                      )}
                    >
                      <span className="truncate font-medium text-foreground">{item.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular-nums text-muted-foreground">
                          {formatMuscleValue(item.raw, mode)}
                        </span>
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          {Math.round(item.score * 100)}%
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  {mode === "strength"
                    ? "Nenhum exercício com carga registrado."
                    : "Nenhum músculo com volume registrado."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Least Muscles List */}
          <Card className="border-border/60 bg-card/25">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">
                  {mode === "fatigue"
                    ? "Mais Recuperados"
                    : mode === "strength"
                      ? "Menor Força / Sem Aferição"
                      : "Precisam de Atenção"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {mapData?.ranked?.least?.length > 0 ? (
                mapData.ranked.least.slice(0, 6).map((id) => {
                  const item = muscleMap[id];
                  if (!item) return null;
                  const isSelected = selectedMuscleId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedMuscleId(isSelected ? null : id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-primary/20 border border-primary/40 font-semibold"
                          : "bg-secondary/30 hover:bg-secondary/60 border border-transparent",
                      )}
                    >
                      <span className="truncate font-medium text-foreground">{item.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular-nums text-muted-foreground">
                          {formatMuscleValue(item.raw, mode)}
                        </span>
                        <span className="rounded-full bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {item.raw === 0
                            ? mode === "fatigue"
                              ? "Recuperado"
                              : mode === "strength"
                                ? "Sem registro"
                                : "Sem treino"
                            : `${Math.round(item.score * 100)}%`}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  {mode === "fatigue"
                    ? "Todos os músculos receberam algum estímulo recente."
                    : "Todos os músculos receberam estímulo."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Front / Anterior Body SVG Schematic (Original Vector Art)
 */
function FrontBodySvg({ muscleMap, selectedId, onSelectMuscle, mode = "balance" }) {
  const getStyle = (id) => {
    const data = muscleMap[id] || { score: 0 };
    const color = getMuscleColor(data.score, mode);
    const isSelected = selectedId === id;
    const highlightStroke = mode === "fatigue" ? "#fb923c" : "#fbbf24";

    return {
      fill: color.fill,
      stroke: isSelected ? highlightStroke : color.stroke,
      strokeWidth: isSelected ? 2.5 : 1,
      filter: isSelected
        ? mode === "fatigue"
          ? "drop-shadow(0 0 6px rgba(251, 146, 60, 0.6))"
          : "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))"
        : undefined,
      cursor: "pointer",
      transition: "all 0.2s ease",
    };
  };

  return (
    <svg
      viewBox="0 0 200 400"
      className="w-full h-full max-h-[380px] select-none"
      aria-label="Mapa Muscular Anterior"
    >
      {/* Background Body Base Silhouette */}
      <g className="text-border/20 fill-current opacity-30">
        {/* Head */}
        <circle cx="100" cy="24" r="14" />
        {/* Torso & Limbs Base Outline */}
        <path d="M88,38 L112,38 L122,54 L154,68 L168,130 L180,205 L172,212 L158,150 L146,190 L150,270 L146,350 L152,380 L130,380 L124,300 L110,210 L100,200 L90,210 L76,300 L70,380 L48,380 L54,350 L50,270 L54,190 L42,150 L28,212 L20,205 L32,130 L46,68 L78,54 Z" />
      </g>

      {/* Trapezius (Front / Neck Base) */}
      <path
        d="M86,38 L114,38 L124,54 L100,58 L76,54 Z"
        style={getStyle("trapezius")}
        onClick={() => onSelectMuscle("trapezius")}
        data-muscle="trapezius"
      >
        <title>Trapézio</title>
      </path>

      {/* Deltoids (Left & Right Anterior) */}
      <path
        d="M48,68 L74,56 L70,86 L44,92 Z"
        style={getStyle("deltoids")}
        onClick={() => onSelectMuscle("deltoids")}
        data-muscle="deltoids"
      >
        <title>Deltoides (Ombro Esquerdo)</title>
      </path>
      <path
        d="M152,68 L126,56 L130,86 L156,92 Z"
        style={getStyle("deltoids")}
        onClick={() => onSelectMuscle("deltoids")}
        data-muscle="deltoids"
      >
        <title>Deltoides (Ombro Direito)</title>
      </path>

      {/* Chest (Left & Right Pectorals) */}
      <path
        d="M74,60 L98,62 L98,102 L68,98 L68,76 Z"
        style={getStyle("chest")}
        onClick={() => onSelectMuscle("chest")}
        data-muscle="chest"
      >
        <title>Peitoral (Esquerdo)</title>
      </path>
      <path
        d="M126,60 L102,62 L102,102 L132,98 L132,76 Z"
        style={getStyle("chest")}
        onClick={() => onSelectMuscle("chest")}
        data-muscle="chest"
      >
        <title>Peitoral (Direito)</title>
      </path>

      {/* Biceps (Left & Right) */}
      <path
        d="M42,94 L66,88 L60,132 L38,130 Z"
        style={getStyle("biceps")}
        onClick={() => onSelectMuscle("biceps")}
        data-muscle="biceps"
      >
        <title>Bíceps (Esquerdo)</title>
      </path>
      <path
        d="M158,94 L134,88 L140,132 L162,130 Z"
        style={getStyle("biceps")}
        onClick={() => onSelectMuscle("biceps")}
        data-muscle="biceps"
      >
        <title>Bíceps (Direito)</title>
      </path>

      {/* Forearms (Left & Right) */}
      <path
        d="M36,134 L58,135 L50,192 L30,188 Z"
        style={getStyle("forearm")}
        onClick={() => onSelectMuscle("forearm")}
        data-muscle="forearm"
      >
        <title>Antebraço (Esquerdo)</title>
      </path>
      <path
        d="M164,134 L142,135 L150,192 L170,188 Z"
        style={getStyle("forearm")}
        onClick={() => onSelectMuscle("forearm")}
        data-muscle="forearm"
      >
        <title>Antebraço (Direito)</title>
      </path>

      {/* Serratus Anterior (Ribs sides) */}
      <path
        d="M66,102 L76,104 L74,136 L64,132 Z"
        style={getStyle("serratus")}
        onClick={() => onSelectMuscle("serratus")}
        data-muscle="serratus"
      >
        <title>Serrátil (Esquerdo)</title>
      </path>
      <path
        d="M134,102 L124,104 L126,136 L136,132 Z"
        style={getStyle("serratus")}
        onClick={() => onSelectMuscle("serratus")}
        data-muscle="serratus"
      >
        <title>Serrátil (Direito)</title>
      </path>

      {/* Abs (Rectus Abdominis / Core) */}
      <path
        d="M78,104 L122,104 L120,158 L80,158 Z"
        style={getStyle("abs")}
        onClick={() => onSelectMuscle("abs")}
        data-muscle="abs"
      >
        <title>Abdômen</title>
      </path>

      {/* Obliques (Flanks) */}
      <path
        d="M64,136 L78,138 L80,166 L66,164 Z"
        style={getStyle("obliques")}
        onClick={() => onSelectMuscle("obliques")}
        data-muscle="obliques"
      >
        <title>Oblíquos (Esquerdo)</title>
      </path>
      <path
        d="M136,136 L122,138 L120,166 L134,164 Z"
        style={getStyle("obliques")}
        onClick={() => onSelectMuscle("obliques")}
        data-muscle="obliques"
      >
        <title>Oblíquos (Direito)</title>
      </path>

      {/* Hip Flexors (Groin/Pelvis) */}
      <path
        d="M82,162 L118,162 L110,188 L90,188 Z"
        style={getStyle("hip-flexors")}
        onClick={() => onSelectMuscle("hip-flexors")}
        data-muscle="hip-flexors"
      >
        <title>Flexores de Quadril</title>
      </path>

      {/* Quadriceps (Front Thighs) */}
      <path
        d="M58,190 L88,188 L86,270 L60,268 Z"
        style={getStyle("quadriceps")}
        onClick={() => onSelectMuscle("quadriceps")}
        data-muscle="quadriceps"
      >
        <title>Quadríceps (Esquerdo)</title>
      </path>
      <path
        d="M142,190 L112,188 L114,270 L140,268 Z"
        style={getStyle("quadriceps")}
        onClick={() => onSelectMuscle("quadriceps")}
        data-muscle="quadriceps"
      >
        <title>Quadríceps (Direito)</title>
      </path>

      {/* Adductors (Inner Thighs) */}
      <path
        d="M88,190 L98,196 L94,250 L86,246 Z"
        style={getStyle("adductors")}
        onClick={() => onSelectMuscle("adductors")}
        data-muscle="adductors"
      >
        <title>Adutores (Esquerdo)</title>
      </path>
      <path
        d="M112,190 L102,196 L106,250 L114,246 Z"
        style={getStyle("adductors")}
        onClick={() => onSelectMuscle("adductors")}
        data-muscle="adductors"
      >
        <title>Adutores (Direito)</title>
      </path>

      {/* Tibialis (Front Shins) */}
      <path
        d="M62,284 L76,284 L72,352 L60,350 Z"
        style={getStyle("tibialis")}
        onClick={() => onSelectMuscle("tibialis")}
        data-muscle="tibialis"
      >
        <title>Tibial (Esquerdo)</title>
      </path>
      <path
        d="M138,284 L124,284 L128,352 L140,350 Z"
        style={getStyle("tibialis")}
        onClick={() => onSelectMuscle("tibialis")}
        data-muscle="tibialis"
      >
        <title>Tibial (Direito)</title>
      </path>

      {/* Calves (Front Lateral View) */}
      <path
        d="M52,286 L60,286 L58,344 L50,338 Z"
        style={getStyle("calves")}
        onClick={() => onSelectMuscle("calves")}
        data-muscle="calves"
      >
        <title>Panturrilhas (Lateral Esquerda)</title>
      </path>
      <path
        d="M148,286 L140,286 L142,344 L150,338 Z"
        style={getStyle("calves")}
        onClick={() => onSelectMuscle("calves")}
        data-muscle="calves"
      >
        <title>Panturrilhas (Lateral Direita)</title>
      </path>
    </svg>
  );
}

/**
 * Back / Posterior Body SVG Schematic (Original Vector Art)
 */
function BackBodySvg({ muscleMap, selectedId, onSelectMuscle, mode = "balance" }) {
  const getStyle = (id) => {
    const data = muscleMap[id] || { score: 0 };
    const color = getMuscleColor(data.score, mode);
    const isSelected = selectedId === id;
    const highlightStroke = mode === "fatigue" ? "#fb923c" : "#fbbf24";

    return {
      fill: color.fill,
      stroke: isSelected ? highlightStroke : color.stroke,
      strokeWidth: isSelected ? 2.5 : 1,
      filter: isSelected
        ? mode === "fatigue"
          ? "drop-shadow(0 0 6px rgba(251, 146, 60, 0.6))"
          : "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))"
        : undefined,
      cursor: "pointer",
      transition: "all 0.2s ease",
    };
  };

  return (
    <svg
      viewBox="0 0 200 400"
      className="w-full h-full max-h-[380px] select-none"
      aria-label="Mapa Muscular Posterior"
    >
      {/* Background Body Base Silhouette */}
      <g className="text-border/20 fill-current opacity-30">
        {/* Head */}
        <circle cx="100" cy="24" r="14" />
        {/* Back Outline */}
        <path d="M88,38 L112,38 L122,54 L154,68 L168,130 L180,205 L172,212 L158,150 L146,190 L150,270 L146,350 L152,380 L130,380 L124,300 L110,210 L100,200 L90,210 L76,300 L70,380 L48,380 L54,350 L50,270 L54,190 L42,150 L28,212 L20,205 L32,130 L46,68 L78,54 Z" />
      </g>

      {/* Trapezius (Upper & Mid Spine Diamond) */}
      <path
        d="M86,38 L114,38 L130,56 L100,104 L70,56 Z"
        style={getStyle("trapezius")}
        onClick={() => onSelectMuscle("trapezius")}
        data-muscle="trapezius"
      >
        <title>Trapézio (Dorsal Superior)</title>
      </path>

      {/* Deltoids (Rear Delts) */}
      <path
        d="M48,68 L68,58 L66,88 L44,92 Z"
        style={getStyle("deltoids")}
        onClick={() => onSelectMuscle("deltoids")}
        data-muscle="deltoids"
      >
        <title>Deltoides Posterior (Esquerdo)</title>
      </path>
      <path
        d="M152,68 L132,58 L134,88 L156,92 Z"
        style={getStyle("deltoids")}
        onClick={() => onSelectMuscle("deltoids")}
        data-muscle="deltoids"
      >
        <title>Deltoides Posterior (Direito)</title>
      </path>

      {/* Upper Back (Lats & Rhomboids Wings) */}
      <path
        d="M68,90 L98,106 L96,144 L64,136 Z"
        style={getStyle("upper-back")}
        onClick={() => onSelectMuscle("upper-back")}
        data-muscle="upper-back"
      >
        <title>Dorsal / Costas (Esquerda)</title>
      </path>
      <path
        d="M132,90 L102,106 L104,144 L136,136 Z"
        style={getStyle("upper-back")}
        onClick={() => onSelectMuscle("upper-back")}
        data-muscle="upper-back"
      >
        <title>Dorsal / Costas (Direita)</title>
      </path>

      {/* Triceps (Back Arms) */}
      <path
        d="M42,94 L64,90 L58,132 L38,130 Z"
        style={getStyle("triceps")}
        onClick={() => onSelectMuscle("triceps")}
        data-muscle="triceps"
      >
        <title>Tríceps (Esquerdo)</title>
      </path>
      <path
        d="M158,94 L136,90 L142,132 L162,130 Z"
        style={getStyle("triceps")}
        onClick={() => onSelectMuscle("triceps")}
        data-muscle="triceps"
      >
        <title>Tríceps (Direito)</title>
      </path>

      {/* Forearms (Posterior Lower Arms) */}
      <path
        d="M36,134 L56,135 L50,192 L30,188 Z"
        style={getStyle("forearm")}
        onClick={() => onSelectMuscle("forearm")}
        data-muscle="forearm"
      >
        <title>Antebraço (Esquerdo)</title>
      </path>
      <path
        d="M164,134 L144,135 L150,192 L170,188 Z"
        style={getStyle("forearm")}
        onClick={() => onSelectMuscle("forearm")}
        data-muscle="forearm"
      >
        <title>Antebraço (Direito)</title>
      </path>

      {/* Lower Back (Lumbar / Spine) */}
      <path
        d="M74,144 L126,144 L122,176 L78,176 Z"
        style={getStyle("lower-back")}
        onClick={() => onSelectMuscle("lower-back")}
        data-muscle="lower-back"
      >
        <title>Lombar</title>
      </path>

      {/* Gluteal (Glutes / Buttocks) */}
      <path
        d="M58,178 L98,178 L96,222 L56,218 Z"
        style={getStyle("gluteal")}
        onClick={() => onSelectMuscle("gluteal")}
        data-muscle="gluteal"
      >
        <title>Glúteo (Esquerdo)</title>
      </path>
      <path
        d="M142,178 L102,178 L104,222 L144,218 Z"
        style={getStyle("gluteal")}
        onClick={() => onSelectMuscle("gluteal")}
        data-muscle="gluteal"
      >
        <title>Glúteo (Direito)</title>
      </path>

      {/* Hamstrings (Posterior Thighs) */}
      <path
        d="M58,224 L94,224 L90,278 L62,276 Z"
        style={getStyle("hamstring")}
        onClick={() => onSelectMuscle("hamstring")}
        data-muscle="hamstring"
      >
        <title>Posteriores de Coxa (Esquerdo)</title>
      </path>
      <path
        d="M142,224 L106,224 L110,278 L138,276 Z"
        style={getStyle("hamstring")}
        onClick={() => onSelectMuscle("hamstring")}
        data-muscle="hamstring"
      >
        <title>Posteriores de Coxa (Direito)</title>
      </path>

      {/* Calves (Gastrocnemius & Soleus) */}
      <path
        d="M54,286 L86,286 L80,356 L58,354 Z"
        style={getStyle("calves")}
        onClick={() => onSelectMuscle("calves")}
        data-muscle="calves"
      >
        <title>Panturrilhas (Esquerda)</title>
      </path>
      <path
        d="M146,286 L114,286 L120,356 L142,354 Z"
        style={getStyle("calves")}
        onClick={() => onSelectMuscle("calves")}
        data-muscle="calves"
      >
        <title>Panturrilhas (Direita)</title>
      </path>
    </svg>
  );
}
