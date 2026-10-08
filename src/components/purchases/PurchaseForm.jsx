import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PURCHASE_HORIZON_LABELS } from '@/lib/purchases';

export default function PurchaseForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial.title || '',
    notes: initial.notes || '',
    horizon: initial.horizon || 'medium',
    price_estimate: initial.price_estimate || '',
    url: initial.url || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    onSubmit?.({ ...form, title });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="purchase-title">O que você quer comprar?</Label>
        <Input
          id="purchase-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex.: Curso X, tênis, monitor…"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label>Prazo</Label>
        <Select value={form.horizon} onValueChange={(v) => setForm({ ...form, horizon: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PURCHASE_HORIZON_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="purchase-price">Valor aproximado (opcional)</Label>
        <Input
          id="purchase-price"
          value={form.price_estimate}
          onChange={(e) => setForm({ ...form, price_estimate: e.target.value })}
          placeholder="R$ …"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="purchase-url">Link (opcional)</Label>
        <Input
          id="purchase-url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="purchase-notes">Notas</Label>
        <Textarea
          id="purchase-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Por que quer, quando faz sentido…"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}