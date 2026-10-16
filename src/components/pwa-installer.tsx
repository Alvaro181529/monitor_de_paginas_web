'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // Verificar si ya está en modo standalone (instalada)
      const isStandalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        // @ts-expect-error iOS Safari navigator.standalone check
        window.navigator?.standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success('¡Aplicación PWA instalada exitosamente!');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    } catch (err) {
      console.warn('PWA install prompt listener warning:', err);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info('Para instalar en tu dispositivo, abre las opciones del navegador y selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>PWA Instalada</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstallClick}
      className="border-dashed border-primary/40 hover:border-primary text-xs flex items-center gap-1.5"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Instalar App</span>
    </Button>
  );
}
