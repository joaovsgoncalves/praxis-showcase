import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function WorkoutProgramDialog({ open, onOpenChange, initial = null, onSubmit, busy = false }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
  }, [open, initial]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || busy) return;
    onSubmit?.({ name: cleanName, description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar programa' : 'Novo programa'}</DialogTitle>
          <DialogDescription>
            O programa organiza o ciclo completo: PPL, upper/lower, calistenia ou qualquer divisão tua.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workout-program-name">Nome</Label>
            <Input
              id="workout-program-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Push Pull Legs"
              autoFocus
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workout-program-description">Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="workout-program-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Objetivo, foco do ciclo, observações..."
              rows={3}
              maxLength={500}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || busy}>
              {busy ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar programa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
