'use client';

import { Activity, Bell, BellOff, BookOpen, Plus, RefreshCw, Zap, Users, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PwaInstaller } from '@/components/pwa-installer';
import { useNotifications } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface NavbarProps {
  onNewService: () => void;
  onOpenGuide: () => void;
  onOpenUsers: () => void;
  onCheckAll: () => void;
  isCheckingAll: boolean;
  autoRefreshInterval: number; // en segundos (0 para apagado)
  onChangeAutoRefresh: (sec: number) => void;
  currentUser?: { name: string; email: string; role: string } | null;
}

export function Navbar({
  onNewService,
  onOpenGuide,
  onOpenUsers,
  onCheckAll,
  isCheckingAll,
  autoRefreshInterval,
  onChangeAutoRefresh,
  currentUser,
}: NavbarProps) {
  const router = useRouter();
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, loading: pushLoading } =
    useNotifications();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Sesión finalizada');
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md w-full">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-2">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
                MonitorWeb
              </span>
              <span className="hidden xs:inline-block text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                PWA
              </span>
            </div>
          </div>
        </div>

        {/* Acciones del Navbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* PWA Installer Component en Desktop */}
          <div className="hidden md:block">
            <PwaInstaller />
          </div>

          {/* Selector de auto-refresco */}
          <div className="hidden sm:flex items-center text-[11px] border rounded-md px-1.5 py-1 bg-muted/40 h-8">
            <Zap className="w-3 h-3 mr-1 text-amber-500" />
            <select
              value={autoRefreshInterval}
              onChange={(e) => onChangeAutoRefresh(Number(e.target.value))}
              className="bg-transparent border-none text-[11px] focus:outline-none cursor-pointer text-muted-foreground"
              title="Intervalo de actualización automática"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={0}>Pausado</option>
            </select>
          </div>

          {/* Botón de Comprobar Todos */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCheckAll}
            disabled={isCheckingAll}
            className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 sm:h-8 text-xs flex items-center justify-center gap-1"
            title="Revisar todos los servicios ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden md:inline">Revisar</span>
          </Button>

          {/* Botón de Notificaciones Push */}
          <Button
            variant={isSubscribed ? 'default' : 'outline'}
            size="sm"
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
            disabled={pushLoading}
            className={`h-8 w-8 p-0 sm:w-auto sm:px-2.5 sm:h-8 text-xs flex items-center justify-center gap-1 ${
              isSubscribed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
            title={
              isSubscribed
                ? 'Notificaciones Push ACTIVAS (clic para desactivar)'
                : 'Activar Notificaciones Push'
            }
          >
            {isSubscribed ? (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-xs">Alertas Activas</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden lg:inline text-xs">Alertas</span>
              </>
            )}
          </Button>

          {/* Botón de Gestión de Usuarios (visible para administradores) */}
          {currentUser?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenUsers}
              className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:h-8 text-xs flex items-center justify-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
              title="Administrar usuarios y permisos"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Usuarios</span>
            </Button>
          )}

          {/* Botón de Guía PWA */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenGuide}
            className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:h-8 text-xs flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Guía e instrucciones"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline ml-1">Guía</span>
          </Button>

          {/* Botón Agregar Servicio */}
          <Button
            size="sm"
            onClick={onNewService}
            className="h-8 px-2 sm:px-3 text-xs flex items-center gap-1 bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>

          {/* Botón Cerrar Sesión */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
