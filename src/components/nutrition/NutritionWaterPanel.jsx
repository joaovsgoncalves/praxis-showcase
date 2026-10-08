import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import WaterTracker from '@/components/dashboard/WaterTracker';

function readLocalWater(date) {
  try {
    const ml = localStorage.getItem(`water_ml_${date}`);
    const amount = ml !== null ? Number(ml) : Number(localStorage.getItem(`water_${date}`) || 0) * 250;
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  } catch { return 0; }
}

/** Parent keys this panel by date. Remote persistence is a separate migration. */
export default function NutritionWaterPanel({ date }) {
  const [amount, setAmount] = useState(() => readLocalWater(date));
  useEffect(() => {
    const sync = (event) => {
      if (event.key === null || event.key === `water_ml_${date}` || event.key === `water_${date}`) setAmount(readLocalWater(date));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [date]);
  const update = (value) => {
    try {
      localStorage.setItem(`water_ml_${date}`, String(value));
      setAmount(value);
    } catch { toast.error('Não foi possível salvar a água neste navegador'); }
  };
  return (
    <div className="space-y-1.5">
      <WaterTracker amountMl={amount} onUpdate={update} />
      <p className="px-1 text-xs text-muted-foreground">Água de {date.split('-').reverse().join('/')} · salva neste navegador.</p>
    </div>
  );
}
