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
      <DialogContent className="w-[96vw] max-w-full sm:max-w-3xl md:max-w-4xl max-h-[92vh] p-3 sm:p-6 flex flex-col gap-3 sm:gap-5 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="flex-shrink-0 pb-1 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-xl font-bold tracking-tight truncate">
                Guía PWA y Notificaciones
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                Instalación en dispositivos y configuración de alertas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* TABS CONTAINER */}
        <Tabs defaultValue="notifications" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-lg sm:rounded-xl border flex-shrink-0 gap-1">
            <TabsTrigger
              value="notifications"
              className="text-[11px] sm:text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="truncate">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger
              value="desktop"
              className="text-[11px] sm:text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="truncate">PC / Mac</span>
            </TabsTrigger>
            <TabsTrigger
              value="mobile"
              className="text-[11px] sm:text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">Móvil</span>
            </TabsTrigger>
            <TabsTrigger
              value="daemon"
              className="text-[11px] sm:text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate">Daemon 24/7</span>
            </TabsTrigger>
          </TabsList>

          {/* ÁREA DE CONTENIDO CON SCROLL FLUIDO */}
          <div className="flex-1 overflow-y-auto pr-0.5 sm:pr-1 mt-3 space-y-3">
            {/* TAB: NOTIFICACIONES */}
            <TabsContent value="notifications" className="space-y-3 m-0 focus-visible:outline-none">
              {/* Tarjeta de Estado Actual */}
              <div className="p-3 sm:p-5 rounded-xl border bg-muted/30 flex flex-col gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        isSubscribed ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'
                      }`}
                    />
                    <h4 className="font-semibold text-xs sm:text-sm">Estado en este Dispositivo</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Utilizamos el protocolo estándar <strong>Web Push (VAPID)</strong>.
                    Recibirás alertas inmediatas ante caídas aunque tengas el navegador cerrado.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  {isSubscribed ? (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold h-8">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Alertas Activas</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={subscribeToPush}
                      disabled={loading}
                      className="text-xs bg-primary hover:bg-primary/90 h-8 px-3 shadow-xs w-full sm:w-auto"
                    >
                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                      Activar Alertas Push
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    className="text-xs h-8 px-3 w-full sm:w-auto"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Enviar Alerta de Prueba
                  </Button>
                </div>
              </div>

              {/* Casos en los que se envía notificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-lg sm:rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-red-500 font-semibold text-xs">
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                    <span>Servicio Caído</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Dispara al responder con error HTTP (500, 502, 404), timeout de conexión o falla de DNS.
                  </p>
                </div>

                <div className="p-3 rounded-lg sm:rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Recuperado</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Alerta inmediata cuando la web vuelve a responder con código 200 y latencia normal.
                  </p>
                </div>

                <div className="p-3 rounded-lg sm:rounded-xl border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Latencia Alta</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Avisa si el tiempo de respuesta supera los 2000 ms para anticipar fallas.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB: ESCRITORIO */}
            <TabsContent value="desktop" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="p-3.5 sm:p-5 rounded-xl border bg-card space-y-3">
                <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  Instalación en Chrome, Edge y Brave
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                      1
                    </div>
                    <h5 className="font-semibold text-foreground text-xs">Instalar App</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Haz clic en el botón <strong>&quot;Instalar App&quot;</strong> en la barra superior o en el icono de la barra de direcciones.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                      2
                    </div>
                    <h5 className="font-semibold text-foreground text-xs">Confirmar</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Presiona <strong>&quot;Instalar&quot;</strong> en el diálogo emergente del navegador.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                      3
                    </div>
                    <h5 className="font-semibold text-foreground text-xs">Ventana Nativa</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      La app se abrirá sin barras de navegador y podrás anclarla a tu barra de tareas.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: MÓVIL */}
            <TabsContent value="mobile" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                {/* Android */}
                <div className="p-3.5 sm:p-5 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-emerald-500">
                    <Smartphone className="w-4 h-4" />
                    Android (Chrome / Firefox / Edge)
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    <li>Abre el navegador en tu teléfono y visita el monitor.</li>
                    <li>Toca el menú de <strong>tres puntos</strong> arriba a la derecha.</li>
                    <li>Selecciona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a inicio&quot;</strong>.</li>
                    <li>El icono se creará en tu pantalla de inicio como una app nativa.</li>
                  </ol>
                </div>

                {/* iOS */}
                <div className="p-3.5 sm:p-5 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-blue-500">
                    <Smartphone className="w-4 h-4" />
                    iPhone / iPad (iOS Safari)
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    <li>Abre el monitor en el navegador <strong>Safari</strong> de iOS.</li>
                    <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba).</li>
                    <li>Selecciona <strong>&quot;Agregar al inicio&quot;</strong>.</li>
                    <li>Toca <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha.</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* TAB: DAEMON 24/7 */}
            <TabsContent value="daemon" className="space-y-3 m-0 focus-visible:outline-none">
              <div className="p-3.5 sm:p-5 rounded-xl border bg-card space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-amber-500" />
                    Monitoreo en Segundo Plano (Daemon 24/7)
                  </h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                    Para monitorear sin necesidad de mantener el navegador abierto:
                  </p>
                </div>

                {/* Opción 1: npm run monitor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">
                      Opción 1: Demonio Node.js continuo
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('npm run monitor', 'npm')}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedCmd === 'npm' ? (
                        <Check className="w-3 h-3 text-emerald-500 mr-1" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      <span>Copiar</span>
                    </Button>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 border border-slate-800 break-all">
                    <code>npm run monitor</code>
                  </div>
                </div>

                {/* Opción 2: Cron Job */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">
                      Opción 2: Tarea Cron de Linux
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          '* * * * * curl -X POST http://localhost:3000/api/services/check-all >/dev/null 2>&1',
                          'cron'
                        )
                      }
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedCmd === 'cron' ? (
                        <Check className="w-3 h-3 text-emerald-500 mr-1" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      <span>Copiar</span>
                    </Button>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] text-slate-300 border border-slate-800 break-all overflow-x-auto">
                    <code>* * * * * curl -X POST http://localhost:3000/api/services/check-all &gt;/dev/null 2&gt;&amp;1</code>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
