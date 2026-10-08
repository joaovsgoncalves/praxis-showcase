import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fortalezaDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';

const steps = ['Meta', 'Prazo', 'Vínculo'];

export default function GoalWizard({ onSubmit, onCancel, busy, preset = null }) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [timeframe, setTimeframe] = useState('short');
  const [category, setCategory] = useState('personal');
  const [linkType, setLinkType] = useState('task');
  const [linkTitle, setLinkTitle] = useState('');

  useEffect(() => {
    if (!preset) return;
    setTitle(preset.title || '');
    setDescription(preset.description || '');
    setDeadline(preset.deadline || '');
    setTimeframe(preset.timeframe || 'short');
    setCategory(preset.category || 'personal');
    setLinkType(preset.initial_link?.type || 'task');
    setLinkTitle(preset.initial_link?.title || '');
  }, [preset]);

  const canNext0 = title.trim().length >= 2;
  const canNext1 = Boolean(deadline);
  const canSubmit = linkTitle.trim().length >= 2 || title.trim().length >= 2;

  const handleFinish = () => {
    const anchorTitle = linkTitle.trim() || `Primeiro passo: ${title.trim()}`;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      deadline,
      timeframe,
      category,
      initial_link: {
        type: linkType,
        title: anchorTitle,
        date: linkType === 'task' ? (deadline || fortalezaDateKey()) : undefined,
        frequency: linkType === 'habit' ? 'daily' : undefined,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <div
            key={label}
            className={cn(
              'flex-1 rounded-full border px-2 py-1 text-center text-[10px] font-medium sm:text-xs',
              i === step ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground',
            )}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">O que você quer que seja verdade quando essa meta estiver cumprida?</p>
          <Input
            placeholder="Ex.: Correr 5 km sem parar"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-secondary/50"
            autoFocus
          />
          <Textarea
            placeholder="Contexto opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[72px] resize-none bg-secondary/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Curto prazo</SelectItem>
                <SelectItem value="medium">Médio prazo</SelectItem>
                <SelectItem value="long">Longo prazo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoal</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="finance">Financeiro</SelectItem>
                <SelectItem value="learning">Aprendizado</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Até quando essa meta vale? (obrigatório — meta sem prazo vira desejo solto.)</p>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-secondary/50" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Toda meta precisa de um primeiro movimento — escolha tarefa ou hábito.</p>
          <div className="flex gap-2">
            <Button type="button" variant={linkType === 'task' ? 'default' : 'outline'} className="flex-1 rounded-full" onClick={() => setLinkType('task')}>
              Tarefa
            </Button>
            <Button type="button" variant={linkType === 'habit' ? 'default' : 'outline'} className="flex-1 rounded-full" onClick={() => setLinkType('habit')}>
              Hábito
            </Button>
          </div>
          <Input
            placeholder={linkType === 'task' ? 'Ex.: Agendar corrida de teste no sábado' : 'Ex.: Caminhar 20 min'}
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            className="bg-secondary/50"
          />
        </div>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}>
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        {step < 2 ? (
          <Button
            type="button"
            disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1)}
            onClick={() => setStep((s) => s + 1)}
          >
            Continuar
          </Button>
        ) : (
          <Button type="button" disabled={!canSubmit || busy} onClick={handleFinish}>
            {busy ? 'Criando…' : 'Criar meta + vínculo'}
          </Button>
        )}
      </div>
    </div>
  );
}