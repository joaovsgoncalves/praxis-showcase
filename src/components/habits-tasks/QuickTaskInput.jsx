import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

export default function QuickTaskInput({ onAdd, isPending }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Adicionar tarefa rápida..."
        className="flex-1 text-sm h-9"
        disabled={isPending}
      />
      <Button type="submit" size="sm" className="h-9 px-3" disabled={isPending || !title.trim()}>
        <Plus className="w-4 h-4 mr-1" />
        Criar
      </Button>
    </form>
  );
}
