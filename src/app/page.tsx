'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { StatsOverview } from '@/components/stats-overview';
import { ServiceCard, ServiceItem } from '@/components/services/service-card';
import { ServiceDialog } from '@/components/services/service-dialog';
import { HistoryDialog } from '@/components/services/history-dialog';
import { PwaGuideDialog } from '@/components/pwa-guide-dialog';
import { UsersDialog } from '@/components/users-dialog';
import { CategoriesDialog, CategoryItem } from '@/components/categories-dialog';
import { ReportsDialog } from '@/components/reports-dialog';
import { MaintenanceDialog } from '@/components/maintenance-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Globe2, PlusCircle, AlertTriangle, RefreshCw, FolderTree, Tag, Server, Lock, Globe } from 'lucide-react';
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
  const [categories, setCategories] = useState<CategoryItem[]>([]);
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [checkTypeFilter, setCheckTypeFilter] = useState<string>('all');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(30);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dialog States
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedServiceForHistory, setSelectedServiceForHistory] = useState<ServiceItem | null>(null);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);

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

  // Cargar categorías disponibles
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.warn('Error al cargar categorías:', e);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Cargar servicios y estadísticas
  const fetchServices = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/services');
      if (!res.ok) {
        throw new Error(`Error en el servidor: HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data.success) {
        setServices(data.services || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        throw new Error(data.error || 'Error al obtener la lista de servicios');
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setFetchError(msg);
      if (!isSilent) {
        toast.error(`Error de conexión: ${msg}`);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Auto-refresh en background
  useEffect(() => {
    if (autoRefreshSec <= 0) return;

    const interval = setInterval(() => {
      fetchServices(true);
    }, autoRefreshSec * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchServices]);

  // Chequeo masivo
  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await fetch('/api/services/check-all', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `Revisión finalizada: ${data.upCount} en línea, ${data.downCount} caídos, ${data.degradedCount} lentos`
        );
        fetchServices(true);
      } else {
        toast.error(`Fallo al revisar: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error en chequeo masivo: ${(err as Error).message}`);
    } finally {
      setIsCheckingAll(false);
    }
  };

  // Eliminar un servicio
  const handleDeleteService = async (id: string, name: string) => {
    if (currentUser?.role === 'observador') {
      toast.error('Los usuarios observadores solo tienen permisos de lectura.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success(`Servicio "${name}" eliminado correctamente`);
        fetchServices(true);
      } else {
        toast.error(`Error al eliminar: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error al eliminar: ${(err as Error).message}`);
    }
  };

  // Filtrado de servicios (por término de búsqueda, estado, categoría y tipo de chequeo)
  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.category && srv.category.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter !== 'all' && srv.status !== statusFilter) return false;

    if (categoryFilter !== 'all') {
      const srvCat = srv.category || 'General';
      if (srvCat !== categoryFilter) return false;
    }

    if (checkTypeFilter !== 'all') {
      const srvType = srv.checkType || 'HTTP';
      if (srvType !== checkTypeFilter) return false;
    }

    return true;
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
        onOpenCategories={() => setIsCategoriesOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenMaintenance={() => setIsMaintenanceOpen(true)}
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

        {/* BARRA DE FILTRO POR CATEGORÍAS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1 flex-shrink-0">
            <FolderTree className="w-3.5 h-3.5 text-primary" /> Categorías:
          </span>

          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Todas ({services.length})
          </button>

          {categories.map((cat) => {
            const count = services.filter((s) => (s.category || 'General') === cat.name).length;
            const isSelected = categoryFilter === cat.name;

            return (
              <button
                key={cat.id || cat.name}
                onClick={() => setCategoryFilter(cat.name)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 flex-shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1 py-0 rounded-full ${isSelected ? 'bg-primary-foreground/20' : 'bg-background/80'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS POR ESTADO / TIPO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-card p-2 sm:p-3 rounded-xl border border-border/60 shadow-xs">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar servicio, URL o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs sm:text-sm bg-background/50 border-input/60 focus:bg-background"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Filtro por Tipo de Chequeo */}
            <select
              value={checkTypeFilter}
              onChange={(e) => setCheckTypeFilter(e.target.value)}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs outline-none"
              title="Filtrar por tipo de chequeo"
            >
              <option value="all">Todos los Tipos</option>
              <option value="HTTP">Solo HTTP/Web</option>
              <option value="TCP">Solo TCP Port</option>
              <option value="SSL">Solo SSL/TLS</option>
            </select>

            {/* Tabs de Filtro de Estado */}
            <Tabs
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as 'all' | 'up' | 'down' | 'degraded')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full sm:w-auto h-8 p-0.5 bg-muted/60">
                <TabsTrigger value="all" className="text-[10px] sm:text-xs px-2 h-7 font-medium">
                  Todos
                </TabsTrigger>
                <TabsTrigger
                  value="up"
                  className="text-[10px] sm:text-xs px-2 h-7 font-medium text-emerald-600 dark:text-emerald-400"
                >
                  OK ({stats.up})
                </TabsTrigger>
                <TabsTrigger
                  value="down"
                  className="text-[10px] sm:text-xs px-2 h-7 font-medium text-red-600 dark:text-red-400"
                >
                  Caídos ({stats.down})
                </TabsTrigger>
                <TabsTrigger
                  value="degraded"
                  className="text-[10px] sm:text-xs px-2 h-7 font-medium text-amber-600 dark:text-amber-400"
                >
                  Lentos ({stats.degraded})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* ALERTA DE ERROR DE CONEXIÓN */}
        {fetchError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchServices()}
              className="h-7 text-xs border-destructive/30 hover:bg-destructive/10"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Reintentar
            </Button>
          </div>
        )}

        {/* ESTADO DE CARGA */}
        {isLoading && services.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Cargando monitor de servicios...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          /* ESTADO VACÍO O SIN RESULTADOS */
          <div className="text-center py-10 sm:py-16 px-4 bg-card rounded-2xl border border-dashed border-border/80 space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              {services.length === 0 ? (
                <Globe2 className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>

            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="font-semibold text-sm sm:text-base">
                {services.length === 0
                  ? 'No hay servicios registrados'
                  : 'Sin resultados para tu búsqueda'}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {services.length === 0
                  ? 'Agrega tus primeros endpoints, bases de datos o certificados para comenzar a monitorear su disponibilidad.'
                  : `No se encontraron coincidencias para "${searchTerm}". Intenta con otros términos o limpia los filtros.`}
              </p>
            </div>

            {services.length === 0 ? (
              <Button
                onClick={() => {
                  if (currentUser?.role === 'observador') {
                    toast.error('Los usuarios observadores solo tienen permisos de lectura.');
                    return;
                  }
                  setServiceToEdit(null);
                  setIsServiceDialogOpen(true);
                }}
                size="sm"
                className="mt-2 text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Agregar Primer Servicio
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setCheckTypeFilter('all');
                }}
                className="mt-2 text-xs"
              >
                Restablecer Filtros
              </Button>
            )}
          </div>
        ) : (
          /* GRILLA DE SERVICIOS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredServices.map((srv) => (
              <ServiceCard
                key={srv._id}
                service={srv}
                onRefresh={() => fetchServices(true)}
                onViewHistory={(service) => {
                  setSelectedServiceForHistory(service);
                  setIsHistoryDialogOpen(true);
                }}
                onEdit={(service) => {
                  if (currentUser?.role === 'observador') {
                    toast.error('Los usuarios observadores solo tienen permisos de lectura.');
                    return;
                  }
                  setServiceToEdit(service);
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportsOpen(true)}
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Reportes SLA
            </button>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Guía PWA
            </button>
          </div>
        </div>
      </footer>

      {/* MODALES */}
      <ServiceDialog
        open={isServiceDialogOpen}
        onOpenChange={setIsServiceDialogOpen}
        serviceToEdit={serviceToEdit}
        onSuccess={() => {
          fetchServices(true);
          fetchCategories();
        }}
        availableCategories={categories}
      />

      <HistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        service={selectedServiceForHistory}
      />

      <CategoriesDialog
        open={isCategoriesOpen}
        onOpenChange={setIsCategoriesOpen}
        currentUserRole={currentUser?.role}
        onCategoriesChanged={() => {
          fetchCategories();
          fetchServices(true);
        }}
      />

      <ReportsDialog
        open={isReportsOpen}
        onOpenChange={setIsReportsOpen}
        categories={categories}
        services={services}
      />

      <MaintenanceDialog
        open={isMaintenanceOpen}
        onOpenChange={setIsMaintenanceOpen}
        services={services}
        onLogsPurged={() => {
          fetchServices(true);
        }}
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
