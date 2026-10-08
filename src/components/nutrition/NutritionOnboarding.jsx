import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  SEX_LABELS,
  formatGrams,
  formatKcal,
} from '@/lib/nutrition';
import { toast } from 'sonner';

/**
 * Wizard 1ª visita: peso/altura/objetivo → sugestão → salva meta.
 * Aparece quando ainda não tem target_kcal e onboarding não foi fechado.
 */
export default function NutritionOnboarding({ profile, onDone }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    sex: profile?.sex || 'male',
    birth_year: profile?.birth_year != null ? String(profile.birth_year) : '',
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : '',
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : '',
    activity: profile?.activity || 'moderate',
    goal: profile?.goal || 'lose',
  });
  const [suggestion, setSuggestion] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const num = (v) => {
    if (v === '' || v == null) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const toPayload = () => ({
    sex: form.sex,
    birth_year: num(form.birth_year),
    height_cm: num(form.height_cm),
    weight_kg: num(form.weight_kg),
    activity: form.activity,
    goal: form.goal,
  });

  const suggestMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.suggestProfile(data),
    onSuccess: (sug) => {
      setSuggestion(sug);
      setStep(2);
    },
    onError: (err) => {
      toast.error(err?.message || 'Informe peso e altura pra sugerir a meta');
    },
  });

  const saveMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success('Meta pronta — bora pro diário');
      onDone?.();
    },
    onError: () => toast.error('Não deu pra salvar a meta'),
  });

  const skipMut = useMutation({
    mutationFn: () =>
      praxisApi.nutrition.updateProfile({ onboarding_done: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'profile'] });
      onDone?.();
    },
  });

  const onSuggest = () => {
    const payload = toPayload();
    if (!payload.weight_kg || !payload.height_cm) {
      toast.error('Preenche peso e altura');
      return;
    }
    suggestMut.mutate(payload);
  };

  const onConfirm = () => {
    if (!suggestion) return;
    saveMut.mutate({
      ...toPayload(),
      target_kcal: suggestion.target_kcal,
      target_protein_g: suggestion.target_protein_g,
      target_carbs_g: suggestion.target_carbs_g,
      target_fat_g: suggestion.target_fat_g,
      target_fiber_g: suggestion.target_fiber_g,
      onboarding_done: 1,
    });
  };

  return (
    <Card className="border-border/80 bg-card/40 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Configurar nutrição</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          {step === 1
            ? 'Passo 1 de 2 — teus dados pra sugerir a meta do dia.'
            : 'Passo 2 de 2 — confere a sugestão e salva (pode mudar depois).'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Objetivo</Label>
                <Select value={form.goal} onValueChange={(v) => setField('goal', v)}>
                  <SelectTrigger className="bg-secondary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sexo</Label>
                <Select value={form.sex} onValueChange={(v) => setField('sex', v)}>
                  <SelectTrigger className="bg-secondary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEX_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="bg-secondary/40 tabular-nums"
                  value={form.weight_kg}
                  onChange={(e) => setField('weight_kg', e.target.value)}
                  placeholder="80"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="bg-secondary/40 tabular-nums"
                  value={form.height_cm}
                  onChange={(e) => setField('height_cm', e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs text-muted-foreground">Ano nasc.</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="bg-secondary/40 tabular-nums"
                  value={form.birth_year}
                  onChange={(e) => setField('birth_year', e.target.value)}
                  placeholder="1995"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Atividade</Label>
              <Select value={form.activity} onValueChange={(v) => setField('activity', v)}>
                <SelectTrigger className="bg-secondary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={onSuggest}
                disabled={suggestMut.isPending}
              >
                {suggestMut.isPending ? 'Calculando…' : 'Sugerir minha meta'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full text-muted-foreground"
                onClick={() => skipMut.mutate()}
                disabled={skipMut.isPending}
              >
                Pular por agora
              </Button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O catálogo já vem com dezenas de alimentos BR (arroz, feijão, frango…).
              Você pode editar a meta depois na aba Meta.
            </p>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-2">
              <p className="text-sm font-semibold">Sugestão do dia</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatKcal(suggestion?.target_kcal)}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                P {formatGrams(suggestion?.target_protein_g)} · C{' '}
                {formatGrams(suggestion?.target_carbs_g)} · G{' '}
                {formatGrams(suggestion?.target_fat_g)}
              </p>
              <p className="text-xs text-muted-foreground">
                {suggestion?.note ||
                  'Sugestão com base no seu peso, altura e objetivo — pode mudar à vontade.'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={onConfirm}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? 'Salvando…' : 'Usar esta meta'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => setStep(1)}
              >
                Voltar e ajustar dados
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
