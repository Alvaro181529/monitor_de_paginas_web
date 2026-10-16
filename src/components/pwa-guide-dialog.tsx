'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Smartphone,
  Monitor,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Radio,
  Zap,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { toast } from 'sonner';

interface PwaGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PwaGuideDialog({ open, onOpenChange }: PwaGuideDialogProps) {
  const { isSubscribed, subscribeToPush, sendTestNotification, loading } = useNotifications();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-full sm:max-w-3xl md:max-w-4xl max-h-[94vh] p-2.5 sm:p-5 flex flex-col gap-2 sm:gap-4 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="flex-shrink-0 pr-8 pb-1 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xs sm:text-base font-bold tracking-tight truncate">
                Guía PWA y Alertas
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Instalación en dispositivos y configuración
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* TABS CONTAINER */}
        <Tabs defaultValue="notifications" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-lg border flex-shrink-0 gap-1">
            <TabsTrigger
              value="notifications"
              className="text-[10px] sm:text-xs font-medium py-1 px-1.5 flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs truncate"
            >
              <Bell className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="truncate">Alertas</span>
            </TabsTrigger>
            <TabsTrigger
              value="desktop"
              className="text-[10px] sm:text-xs font-medium py-1 px-1.5 flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs truncate"
            >
              <Monitor className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span className="truncate">PC / Mac</span>
            </TabsTrigger>
            <TabsTrigger
              value="mobile"
              className="text-[10px] sm:text-xs font-medium py-1 px-1.5 flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs truncate"
            >
              <Smartphone className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="truncate">Móvil</span>
            </TabsTrigger>
            <TabsTrigger
              value="daemon"
              className="text-[10px] sm:text-xs font-medium py-1 px-1.5 flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs truncate"
            >
              <Terminal className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="truncate">Daemon 24/7</span>
            </TabsTrigger>
          </TabsList>

          {/* ÁREA DE CONTENIDO CON SCROLL FLUIDO */}
          <div className="flex-1 overflow-y-auto pr-0.5 mt-2 space-y-2.5">
            {/* TAB: NOTIFICACIONES */}
            <TabsContent value="notifications" className="space-y-2.5 m-0 focus-visible:outline-none">
              {/* Tarjeta de Estado Actual */}
              <div className="p-2.5 sm:p-4 rounded-xl border bg-muted/30 flex flex-col gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Radio
                      className={`w-3 h-3 ${
                        isSubscribed ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'
                      }`}
                    />
                    <h4 className="font-semibold text-xs sm:text-sm">Estado en este Dispositivo</h4>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                    Utilizamos el protocolo estándar <strong>Web Push (VAPID)</strong>.
                    Recibirás alertas inmediatas ante caídas aunque tengas el navegador cerrado.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pt-0.5">
                  {isSubscribed ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex-1">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[11px] truncate">Notificaciones activas en este dispositivo</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={subscribeToPush}
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7 sm:h-8 flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" /> Activar Notificaciones Push Ahora
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    className="text-xs h-7 sm:h-8 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Probar Alerta
                  </Button>
                </div>
              </div>

              {/* Lógica de Notificaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                    <AlertOctagon className="w-3.5 h-3.5" /> Caída (DOWN)
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                    Si el sitio no responde, timeout (&gt;10s) o error 4xx/5xx, se dispara una notificación urgente con vibración.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Recuperación (UP)
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                    Al restablecerse el servicio, recibirás una confirmación con la latencia registrada en milisegundos.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Lento (DEGRADADO)
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                    Si responde con latencia superior a 2000 ms, se cataloga automáticamente en estado advertencia.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: ESCRITORIO */}
            <TabsContent value="desktop" className="space-y-2.5 m-0 focus-visible:outline-none">
              <div className="p-3 sm:p-4 rounded-xl border bg-muted/30 space-y-2">
                <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-primary" /> Google Chrome / Microsoft Edge / Brave
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  <li>
                    Haz clic en el botón <strong>&quot;Instalar App&quot;</strong> situado en la barra superior o en el icono de instalación de la barra de direcciones.
                  </li>
                  <li>Confirma haciendo clic en <strong>&quot;Instalar&quot;</strong>.</li>
                  <li>La aplicación se abrirá en su propia ventana sin barras de navegador.</li>
                </ol>
              </div>
            </TabsContent>

            {/* TAB: MÓVIL */}
            <TabsContent value="mobile" className="space-y-2.5 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl border bg-muted/30 space-y-1.5">
                  <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-emerald-500">
                    <Smartphone className="w-4 h-4" /> Android (Chrome / Firefox)
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-muted-foreground">
                    <li>Abre el menú de 3 puntos en la esquina superior derecha.</li>
                    <li>Toca en <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.</li>
                    <li>Listo. Se creará un acceso directo con soporte offline.</li>
                  </ol>
                </div>

                <div className="p-3 rounded-xl border bg-muted/30 space-y-1.5">
                  <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-blue-500">
                    <Smartphone className="w-4 h-4" /> iPhone / iPad (Safari)
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-muted-foreground">
                    <li>Abre el monitor en Safari.</li>
                    <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba).</li>
                    <li>Selecciona <strong>&quot;Agregar al inicio&quot;</strong> (Add to Home Screen).</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* TAB: DAEMON */}
            <TabsContent value="daemon" className="space-y-2.5 m-0 focus-visible:outline-none">
              <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
                <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-primary" /> Demonio en Segundo Plano 24/7
                </h4>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  Para monitorear permanentemente sin tener el navegador abierto, el contenedor Docker ya lo ejecuta de manera nativa. También puedes iniciarlo manualmente:
                </p>

                <div className="relative group">
                  <pre className="bg-slate-950 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] sm:text-xs overflow-x-auto border border-border/50">
                    npm run monitor
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('npm run monitor', 'npm')}
                    className="absolute right-1 top-1 h-6 px-1.5 text-[10px]"
                  >
                    {copiedCmd === 'npm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
