import { usePraxisLevelUpListener } from '@/lib/praxisLevelUp';

/** Escuta praxis-level-up globalmente (toast diz Praxis). */
export default function PraxisLevelUpListener() {
  usePraxisLevelUpListener();
  return null;
}