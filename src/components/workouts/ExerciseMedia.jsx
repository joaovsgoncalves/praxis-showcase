import React, { useEffect, useState } from "react";
import {
  Dumbbell,
  ExternalLink,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { praxisApi } from "@/api/praxisClient";
import { Button } from "@/components/ui/button";
import {
  gifUrl,
  MEDIA_ATTRIBUTION,
  thumbUrl,
} from "@/lib/workoutV4";
import { cn } from "@/lib/utils";

export const MEDIA_MODE_STORAGE_KEY = "praxis.treinos.mediaMode";

export function getStoredMediaMode() {
  try {
    const saved = localStorage.getItem(MEDIA_MODE_STORAGE_KEY);
    if (saved === "full" || saved === "mini") return saved;
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return "mini";
}

export function setStoredMediaMode(mode) {
  try {
    localStorage.setItem(MEDIA_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

/**
 * ExerciseMedia — Treinos V4 Fase 5
 *
 * Displays exercise demonstration media (animated GIF preferred, thumbnail fallback)
 * in active workout sessions when catalog paths exist.
 *
 * Supports:
 * - Persisted "mini" vs "full" mode in localStorage ("praxis.treinos.mediaMode")
 * - Lazy GIF loading (loads static thumbnail in mini mode, loads GIF when expanded)
 * - Autoplay muted loop playsInline GIF display with tap/click pause toggle
 * - Error fallback from GIF to thumbnail, and from thumbnail to placeholder
 * - Discrete Gym visual attribution line
 * - Clean null state for custom exercises without media
 * - variant="encyclopedia": always-full GIF, no mini toggle, no session mediaMode write
 */
export default function ExerciseMedia({
  exercise,
  className,
  defaultMode,
  mode: controlledMode,
  onModeChange,
  showAttribution = true,
  variant = "session",
}) {
  const isEncyclopedia = variant === "encyclopedia";
  const [internalMode, setInternalMode] = useState(() =>
    isEncyclopedia ? "full" : (defaultMode || getStoredMediaMode())
  );
  const mode = isEncyclopedia ? "full" : (controlledMode || internalMode);

  const [isPaused, setIsPaused] = useState(false);
  const [gifError, setGifError] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // If exercise object has exercise_id but media fields are missing/undefined, fetch catalog exercise detail
  const needsFetch = Boolean(
    exercise?.exercise_id &&
    exercise?.thumb_path === undefined &&
    exercise?.gif_path === undefined &&
    !exercise?.image &&
    !exercise?.gif_url
  );

  const { data: fetchedExercise } = useQuery({
    queryKey: ["workouts", "exercise", exercise?.exercise_id],
    queryFn: () => praxisApi.workouts.exercises.get(exercise.exercise_id),
    enabled: needsFetch,
    staleTime: 1000 * 60 * 10,
  });

  const resolvedExercise = fetchedExercise || exercise;
  const exerciseName =
    resolvedExercise?.exercise_name_snapshot ||
    resolvedExercise?.name ||
    "Exercício";

  const fullGifUrl = gifUrl(resolvedExercise);
  const fullThumbUrl = thumbUrl(resolvedExercise);
  const hasMedia = Boolean(fullGifUrl || fullThumbUrl);

  const exerciseKey =
    resolvedExercise?.id ||
    resolvedExercise?.exercise_id ||
    resolvedExercise?.catalog_external_id ||
    exerciseName;

  // Reset loading and error state whenever the displayed exercise changes
  useEffect(() => {
    setGifError(false);
    setThumbError(false);
    setIsLoading(true);
    setIsPaused(false);
  }, [exerciseKey]);

  const handleToggleMode = () => {
    if (isEncyclopedia) return;
    const nextMode = mode === "full" ? "mini" : "full";
    if (!controlledMode) {
      setInternalMode(nextMode);
    }
    setStoredMediaMode(nextMode);
    onModeChange?.(nextMode);
  };

  const handleTogglePause = (e) => {
    e?.stopPropagation();
    setIsPaused((prev) => !prev);
  };

  // Custom exercise without media stays completely clean
  if (!hasMedia) {
    return null;
  }

  // Determine active media URL based on current mode and error states
  // In mini mode: load static thumbnail lazily to save data/battery
  // In full mode: prefer GIF unless paused or error occurred
  let activeSrc = null;
  let isDisplayingGif = false;

  if (mode === "mini") {
    activeSrc = !thumbError && fullThumbUrl ? fullThumbUrl : (!gifError && fullGifUrl ? fullGifUrl : null);
  } else {
    if (!isPaused && !gifError && fullGifUrl) {
      activeSrc = fullGifUrl;
      isDisplayingGif = true;
    } else if (!thumbError && fullThumbUrl) {
      activeSrc = fullThumbUrl;
    } else if (!gifError && fullGifUrl) {
      activeSrc = fullGifUrl;
      isDisplayingGif = true;
    }
  }

  const attributionText = resolvedExercise?.attribution || MEDIA_ATTRIBUTION;
  const hasError = (isDisplayingGif && gifError && thumbError) || (!activeSrc);

  // ---------------------------------------------------------------------------
  // Mini / Collapsed Mode (session only — encyclopedia stays full)
  // ---------------------------------------------------------------------------
  if (mode === "mini" && !isEncyclopedia) {
    return (
      <div
        className={cn(
          "group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/35 p-2 transition-colors hover:border-primary/40 hover:bg-card/55",
          className
        )}
      >
        <button
          type="button"
          onClick={handleToggleMode}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          aria-label="Expandir demonstração do exercício"
        >
          {/* Mini Thumbnail */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-secondary/30">
            {activeSrc && !thumbError ? (
              <img
                src={activeSrc}
                alt={exerciseName}
                loading="lazy"
                onError={() => setThumbError(true)}
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <Dumbbell className="h-5 w-5 text-primary/70" aria-hidden />
            )}
          </div>

          {/* Mini Labels */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-xs font-semibold text-foreground">Demonstração</p>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              Toque para ver execução em GIF
            </p>
          </div>
        </button>

        {/* Expand Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleMode}
          className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Expandir demonstração"
        >
          <Maximize2 className="mr-1 h-3.5 w-3.5" />
          <span className="hidden xs:inline">Expandir</span>
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Full / Expanded Mode
  // ---------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "overflow-hidden bg-card/45 shadow-sm transition-all",
        isEncyclopedia
          ? "rounded-none border-0"
          : "rounded-xl border border-border/75",
        className
      )}
    >
      {/* Media Header Controls — session only */}
      {isEncyclopedia ? null : (
        <div className="flex items-center justify-between border-b border-border/60 bg-background/50 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isDisplayingGif && !isPaused ? "bg-emerald-500 animate-pulse" : "bg-primary/70"
              )}
              aria-hidden
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isDisplayingGif ? (isPaused ? "GIF Pausado" : "Execução") : "Prévia"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {fullGifUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTogglePause}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={isPaused ? "Reproduzir GIF animado" : "Pausar animação"}
              >
                {isPaused ? (
                  <>
                    <Play className="mr-1 h-3 w-3 text-primary" />
                    <span>Play</span>
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-3 w-3" />
                    <span>Pausar</span>
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleMode}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Minimizar demonstração"
            >
              <Minimize2 className="mr-1 h-3 w-3" />
              <span>Mini</span>
            </Button>
          </div>
        </div>
      )}

      {/* Media Frame */}
      <div
        className={cn(
          "relative flex items-center justify-center bg-black/40 p-2 select-none",
          isEncyclopedia ? "min-h-[260px] sm:min-h-[300px] cursor-pointer" : "min-h-[190px] sm:min-h-[220px] cursor-pointer",
        )}
        onClick={fullGifUrl ? handleTogglePause : undefined}
        title={fullGifUrl ? (isPaused ? "Clique para reproduzir" : "Clique para pausar") : undefined}
        role={fullGifUrl ? "button" : undefined}
        tabIndex={fullGifUrl ? 0 : undefined}
        onKeyDown={(e) => {
          if (fullGifUrl && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            handleTogglePause();
          }
        }}
      >
        {activeSrc && !hasError ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            <img
              src={activeSrc}
              alt={exerciseName}
              loading="eager"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                if (isDisplayingGif) {
                  setGifError(true);
                } else {
                  setThumbError(true);
                }
              }}
              className={cn(
                "w-auto object-contain transition-opacity duration-200",
                isEncyclopedia ? "max-h-72 sm:max-h-80" : "max-h-52 sm:max-h-60",
                isLoading ? "opacity-0" : "opacity-100"
              )}
            />
            {isPaused && (
              <div className="absolute bottom-2.5 right-2.5 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xs">
                Pausado
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-card/40 text-primary/70">
              <Dumbbell className="h-6 w-6" aria-hidden />
            </div>
            <span className="text-xs font-medium">Mídia indisponível no momento</span>
          </div>
        )}
      </div>

      {/* Attribution Line */}
      {showAttribution && (
        <div className="border-t border-border/50 bg-background/40 px-3 py-1.5 text-center">
          <a
            href="https://gymvisual.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/75 transition-colors hover:text-primary"
          >
            <span>{attributionText}</span>
            <ExternalLink className="h-2.5 w-2.5" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
