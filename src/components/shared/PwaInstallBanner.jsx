import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'praxis_pwa_install_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** Banner leve para instalar PWA no celular (onda 17). */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (hidden || !deferred) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between lg:hidden">
      <div className="min-w-0">
        <p className="text-sm font-medium">Instalar Praxis no celular</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Abre em tela cheia, com atalho na home — melhor para o dia a dia.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button type="button" size="sm" className="praxis-touch-target gap-1.5" onClick={install}>
          <Download className="h-4 w-4" /> Instalar
        </Button>
        <Button type="button" size="sm" variant="ghost" className="praxis-touch-target" onClick={dismiss} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}