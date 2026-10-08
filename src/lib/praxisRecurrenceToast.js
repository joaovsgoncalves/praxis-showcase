import { toast } from 'sonner';
import { formatNextDateBr } from '@/lib/taskRecurrence';

export function notifyPraxisRecurrenceSpawned(response) {
  const next = response?.next_occurrence;
  if (!next?.date || !next.created) return;
  toast('Próxima ocorrência criada', {
    description: `Agendada para ${formatNextDateBr(next.date)}`,
  });
}