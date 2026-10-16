'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { StatsOverview } from '@/components/stats-overview';
import { ServiceCard, ServiceItem } from '@/components/services/service-card';
import { ServiceDialog } from '@/components/services/service-dialog';
import { HistoryDialog } from '@/components/services/history-dialog';
import { PwaGuideDialog } from '@/components/pwa-guide-dialog';
import { UsersDialog } from '@/components/users-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Globe2, PlusCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'observador';
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    up: 0,
    down: 0,
    degraded: 0,
    active: 0,
    avgLatency: 0,
    uptimeAvg: 100,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down' | 'degraded'>('all');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(30);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dialog States
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedServiceForHistory, setSelectedServiceForHistory] = useState<ServiceItem | null>(null);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  // Consultar usuario actual autenticado
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.warn('Error al verificar sesión:', e);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Cargar lista de servicios y estadísticas de forma robusta
  const fetchServices = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setFetchError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('/api/services', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setServices(data.services || []);
        if (data.stats) setStats(data.stats);
      } else {
        setFetchError(data.error || 'No se pudieron cargar los servicios');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg =
        (err as Error).name === 'AbortError'
          ? 'Tiempo de espera agotado al conectar con el servidor'
          : (err as Error).message || 'Error de red';
      console.warn('Error al consultar servicios:', errorMsg);
      setFetchError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Intervalo de auto-actualización
  useEffect(() => {
    if (autoRefreshSec <= 0) return;

    const interval = setInterval(() => {
      fetchServices(true);
    }, autoRefreshSec * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchServices]);

  // Ejecutar comprobación de todos los servicios
  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      toast.loading('Verificando conectividad...', { id: 'check-all' });
      const res = await fetch('/api/services/check-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Revisión: ${data.upCount} UP, ${data.downCount} DOWN, ${data.degradedCount} lentos`,
          { id: 'check-all' }
        );
        fetchServices(true);
      } else {
        toast.error('Fallo al comprobar: ' + data.error, { id: 'check-all' });
      }
    } catch (err: unknown) {
      toast.error('Error: ' + (err as Error).message, { id: 'check-all' });
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Eliminar un servicio
  const handleDeleteService = async (id: string, name: string) => {
    if (currentUser?.role === 'observador') {
      toast.error('Los usuarios con rol observador solo tienen permisos de lectura.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Servicio "${name}" eliminado`);
        fetchServices(true);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error al eliminar: ${(err as Error).message}`);
    }
  };

  // Filtrado de servicios
  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.url.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    return srv.status === statusFilter;
  });

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-background text-foreground flex flex-col">
      {/* NAVBAR */}
      <Navbar
        onNewService={() => {
          if (currentUser?.role === 'observador') {
            toast.error('Los usuarios observadores solo tienen permisos de lectura.');
            return;
          }
          setServiceToEdit(null);
          setIsServiceDialogOpen(true);
        }}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenUsers={() => setIsUsersOpen(true)}
        onCheckAll={handleCheckAll}
        isCheckingAll={isCheckingAll}
        autoRefreshInterval={autoRefreshSec}
        onChangeAutoRefresh={setAutoRefreshSec}
        currentUser={currentUser}
      />

      {/* CONTENIDO PRINCIPAL */}
      <main className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 py-3.5 sm:py-6 space-y-3.5 sm:space-y-6 flex-1">
        {/* RESUMEN DE MÉTRICAS */}
        <StatsOverview stats={stats} />

        {/* ALERTA DE ERROR DE CONEXIÓN AL SERVIDOR SI FALLA */}
        {fetchError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 min-w-0">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{fetchError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchServices()}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Reintentar
            </Button>
          </div>
        )}

        {/* ALERTA DE INCIDENTES SI HAY SITIOS CAÍDOS */}
        {stats.down > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 bg-red-500/20 text-red-500 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-semibold text-red-500 truncate">
                  {stats.down} {stats.down === 1 ? 'sitio caído' : 'sitios caídos'} actualmente
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Servicios sin respuesta HTTP. Revisa el estado abajo.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCheckAll}
              disabled={isCheckingAll}
              className="text-xs h-8 px-3 w-full sm:w-auto"
            >
              Recomprobar
            </Button>
          </div>
        )}

        {/* FILTROS Y BÚSQUEDA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-4 w-full sm:w-auto text-[10px] sm:text-xs h-8 sm:h-9 p-0.5 sm:p-1">
              <TabsTrigger value="all" className="px-1 py-1">
                Todos ({services.length})
              </TabsTrigger>
              <TabsTrigger
                value="up"
                className="px-1 py-1 text-emerald-500 data-[state=active]:text-emerald-500"
              >
                <span className="hidden xs:inline">Operativos</span>
                <span className="xs:hidden">UP</span> ({stats.up})
              </TabsTrigger>
              <TabsTrigger
                value="down"
                className="px-1 py-1 text-red-500 data-[state=active]:text-red-500"
              >
                <span className="hidden xs:inline">Caídos</span>
                <span className="xs:hidden">DOWN</span> ({stats.down})
              </TabsTrigger>
              <TabsTrigger
                value="degraded"
                className="px-1 py-1 text-amber-500 data-[state=active]:text-amber-500"
              >
                <span className="hidden xs:inline">Lentos</span>
                <span className="xs:hidden">Lento</span> ({stats.degraded})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar sitio o URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8 sm:h-9 w-full"
            />
          </div>
        </div>

        {/* LISTADO DE TARJETAS DE SERVICIOS */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-xl p-4 sm:p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Globe2 className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold">
                {isLoading
                  ? 'Verificando servicios...'
                  : searchTerm || statusFilter !== 'all'
                  ? 'Sin coincidencias con este filtro'
                  : 'Aún no tienes páginas o servicios agregados'}
              </h3>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                {isLoading
                  ? 'Consultando el estado de conexión...'
                  : searchTerm || statusFilter !== 'all'
                  ? 'Prueba modificando la búsqueda o el filtro.'
                  : 'Agrega las URLs de las páginas web o APIs que deseas monitorear.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  if (currentUser?.role === 'observador') {
                    toast.error('Los usuarios observadores solo tienen permisos de lectura.');
                    return;
                  }
                  setServiceToEdit(null);
                  setIsServiceDialogOpen(true);
                }}
                className="text-xs h-8 px-3 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Agregar Primer Servicio</span>
              </Button>

              {fetchError && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchServices()}
                  disabled={isLoading}
                  className="text-xs h-8 px-3 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Reintentar</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 w-full">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                onRefresh={() => fetchServices(true)}
                onViewHistory={(srv) => {
                  setSelectedServiceForHistory(srv);
                  setIsHistoryDialogOpen(true);
                }}
                onEdit={(srv) => {
                  if (currentUser?.role === 'observador') {
                    toast.error('Los usuarios observadores solo tienen permisos de lectura.');
                    return;
                  }
                  setServiceToEdit(srv);
                  setIsServiceDialogOpen(true);
                }}
                onDelete={handleDeleteService}
              />
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t py-3 text-center text-[10px] sm:text-xs text-muted-foreground bg-muted/20 w-full">
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span className="truncate">
            Monitor de Servicios Web &bull; Usuario:{' '}
            <strong className="text-foreground">{currentUser?.name || 'Operador'}</strong> (
            {currentUser?.role || 'operador'})
          </span>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Guía PWA y Notificaciones
          </button>
        </div>
      </footer>

      {/* MODALES */}
      <ServiceDialog
        open={isServiceDialogOpen}
        onOpenChange={setIsServiceDialogOpen}
        serviceToEdit={serviceToEdit}
        onSuccess={() => fetchServices(true)}
      />

      <HistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        service={selectedServiceForHistory}
      />

      <PwaGuideDialog open={isGuideOpen} onOpenChange={setIsGuideOpen} />

      <UsersDialog
        open={isUsersOpen}
        onOpenChange={setIsUsersOpen}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}
