import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, Save } from 'lucide-react';
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
  macrosImpliedKcal,
} from '@/lib/nutrition';
import { toast } from 'sonner';

function str(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function buildForm(profile) {
  return {
    sex: profile?.sex || 'male',
    birth_year: str(profile?.birth_year),
    height_cm: str(profile?.height_cm),
    weight_kg: str(profile?.weight_kg),
    activity: profile?.activity || 'moderate',
    goal: profile?.goal || 'maintain',
    target_kcal: str(profile?.target_kcal),
    target_protein_g: str(profile?.target_protein_g),
    target_carbs_g: str(profile?.target_carbs_g),
    target_fat_g: str(profile?.target_fat_g),
    use_net_carbs: profile?.use_net_carbs === 1 || profile?.use_net_carbs === true,
  };
}

function toPayload(form) {
  const num = (v) => {
    if (v === '' || v == null) return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  return {
    sex: form.sex || null,
    birth_year: num(form.birth_year),
    height_cm: num(form.height_cm),
    weight_kg: num(form.weight_kg),
    activity: form.activity,
    goal: form.goal,
    target_kcal: num(form.target_kcal),
    target_protein_g: num(form.target_protein_g),
    target_carbs_g: num(form.target_carbs_g),
    target_fat_g: num(form.target_fat_g),
    use_net_carbs: form.use_net_carbs ? 1 : 0,
  };
}

export default function NutritionMetaForm({ profile }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(profile));

  useEffect(() => {
    setForm(buildForm(profile));
  }, [profile]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const saveMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      toast.success('Meta salva');
    },
    onError: (err) => {
      toast.error(err?.message || 'Não deu pra salvar a meta');
    },
  });

  const suggestMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.suggestProfile(data),
    onSuccess: (sug) => {
      setForm((f) => ({
        ...f,
        target_kcal: str(sug.target_kcal),
        target_protein_g: str(sug.target_protein_g),
        target_carbs_g: str(sug.target_carbs_g),
        target_fat_g: str(sug.target_fat_g),
      }));
      toast.success('Sugestão preenchida — confira e salve se quiser');
    },
    onError: (err) => {
      toast.error(err?.message || 'Falta peso e altura pra sugerir');
    },
  });

  const implied = useMemo(
    () =>
      macrosImpliedKcal({
        protein_g: form.target_protein_g,
        carbs_g: form.target_carbs_g,
        fat_g: form.target_fat_g,
      }),
    [form.target_protein_g, form.target_carbs_g, form.target_fat_g],
  );

  const targetKcalNum = Number(String(form.target_kcal).replace(',', '.'));
  const kcalMismatch =
    form.target_kcal !== '' &&
    Number.isFinite(targetKcalNum) &&
    targetKcalNum > 0 &&
    Math.abs(implied - targetKcalNum) / targetKcalNum > 0.05;

  const onSave = () => saveMut.mutate(toPayload(form));
  const onSuggest = () => suggestMut.mutate(toPayload(form));

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Seu perfil</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Usado só pra sugerir meta. Você pode editar os números à mão.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label className="text-xs text-muted-foreground">Ano de nascimento</Label>
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

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={onSuggest}
            disabled={suggestMut.isPending}
          >
            <Calculator className="w-4 h-4 mr-2" />
            {suggestMut.isPending ? 'Calculando…' : 'Sugerir meta do dia'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Meta do dia</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Calorias e macros que você quer bater.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Calorias</Label>
            <Input
              type="number"
              inputMode="numeric"
              className="bg-secondary/40 tabular-nums"
              value={form.target_kcal}
              onChange={(e) => setField('target_kcal', e.target.value)}
              placeholder="2200"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Proteína (g)</Label>
              <Input
                type="number"
                inputMode="decimal"
                className="bg-secondary/40 tabular-nums"
                value={form.target_protein_g}
                onChange={(e) => setField('target_protein_g', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Carbo (g)</Label>
              <Input
                type="number"
                inputMode="decimal"
                className="bg-secondary/40 tabular-nums"
                value={form.target_carbs_g}
                onChange={(e) => setField('target_carbs_g', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gordura (g)</Label>
              <Input
                type="number"
                inputMode="decimal"
                className="bg-secondary/40 tabular-nums"
                value={form.target_fat_g}
                onChange={(e) => setField('target_fat_g', e.target.value)}
              />
            </div>
          </div>

          {(form.target_protein_g || form.target_carbs_g || form.target_fat_g) && (
            <p className="text-xs text-muted-foreground tabular-nums">
              Macros somam ~{formatKcal(implied)}
              {kcalMismatch
                ? ' — difere um pouco da meta de calorias (ok se for de propósito)'
                : ''}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={!!form.use_net_carbs}
              onChange={(e) => setField('use_net_carbs', e.target.checked)}
            />
            Contar carbo líquido depois (fase com fibra)
          </label>

          <Button
            type="button"
            className="w-full rounded-full"
            onClick={onSave}
            disabled={saveMut.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMut.isPending ? 'Salvando…' : 'Salvar meta'}
          </Button>

          {profile?.target_kcal != null && (
            <p className="text-xs text-center text-muted-foreground tabular-nums">
              Salvo: {formatKcal(profile.target_kcal)} · P {formatGrams(profile.target_protein_g)} · C{' '}
              {formatGrams(profile.target_carbs_g)} · G {formatGrams(profile.target_fat_g)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
