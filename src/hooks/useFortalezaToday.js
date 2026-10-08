import { useEffect, useState } from 'react';
import { fortalezaDateKey } from '@/lib/dates';

/** Keep an open diary on the right day after midnight or returning to the app. */
export default function useFortalezaToday() {
  const [today, setToday] = useState(() => fortalezaDateKey());
  useEffect(() => {
    const update = () => setToday(fortalezaDateKey());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return today;
}
