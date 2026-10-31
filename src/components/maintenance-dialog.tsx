'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Trash2,
  HardDrive,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: { _id: string; name: string }[];
  onLogsPurged?: () => void;
}

interface MaintenanceStats {
  totalLogs: number;
  oldestLogDate: string | null;
  newestLogDate: string | null;
  retentionDays: number;
  expiredLogsCount: number;
  estimatedSizeMb: string;
  breakdown: {
    up: number;
    down: number;
    degraded: number;
  };
  totalServices: number;
  totalCategories: number;
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  services,
  onLogsPurged,
}: MaintenanceDialogProps) {
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Política de retención editable
  const [selectedDays, setSelectedDays] = useState<number>(15);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Purga por servicio
  const [selectedServiceToPurge, setSelectedServiceToPurge] = useState<string>('');

  const fetchStats = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        setSelectedDays(data.stats.retentionDays || 15);
      } else {
        toast.error(`Error al cargar estado de la base de datos: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open, fetchStats]);

  const handleSaveRetentionPolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: selectedDays }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Política de retención actualizada a ${selectedDays} días`);
        fetchStats();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handlePurgeOldLogs = async () => {
    if (!confirm(`¿Confirmas que deseas eliminar de forma permanente los registros de logs con más de ${selectedDays} días?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_old', days: selectedDays }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Se eliminaron ${data.deletedCount} registros.`);
        fetchStats();
        if (onLogsPurged) onLogsPurged();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeServiceLogs = async () => {
    if (!selectedServiceToPurge) {
      toast.error('Selecciona un servicio para limpiar sus logs');
      return;
    }

    const srv = services.find((s) => s._id === selectedServiceToPurge);
    if (!confirm(`¿Deseas vaciar todos los logs históricos del servicio "${srv?.name || selectedServiceToPurge}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_service', serviceId: selectedServiceToPurge }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Logs de "${srv?.name}" eliminados (${data.deletedCount} registros).`);
        fetchStats();
        if (onLogsPurged) onLogsPurged();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Ninguno';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-2xl p-3 sm:p-6 max-h-[94vh] overflow-y-auto">
        <DialogHeader className="pr-7">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Retención de Logs y Rendimiento de Base de Datos
              </DialogTitle>
              <DialogDescription className="text-xs">
                Administra la política de purga automática de MongoDB para mantener el sistema rápido y ligero.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12 space-y-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Consultando estado de MongoDB...</p>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Métricas Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-card border text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                  Total de Logs
                </span>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats.totalLogs.toLocaleString()}
                </div>
                <span className="text-[9px] text-muted-foreground">En base de datos</span>
              </div>

              <div className="p-3 rounded-xl bg-card border text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                  Espacio Estimado
                </span>
                <div className="text-xl sm:text-2xl font-black text-primary">
                  {stats.estimatedSizeMb} MB
                </div>
                <span className="text-[9px] text-muted-foreground">Almacenamiento</span>
              </div>

              <div className="p-3 rounded-xl bg-card border text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                  Política Activa
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-500">
                  {stats.retentionDays} días
                </div>
                <span className="text-[9px] text-muted-foreground">Retención máx</span>
              </div>

              <div className="p-3 rounded-xl bg-card border text-center space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                  Logs Expirados
                </span>
                <div
                  className={`text-xl sm:text-2xl font-black ${
                    stats.expiredLogsCount > 0 ? 'text-amber-500' : 'text-muted-foreground'
                  }`}
                >
                  {stats.expiredLogsCount.toLocaleString()}
                </div>
                <span className="text-[9px] text-muted-foreground">Por depurar</span>
              </div>
            </div>

            {/* Fechas de Límites */}
            <div className="p-3 rounded-xl bg-muted/40 border text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground block text-[10px]">Registro más antiguo:</span>
                  <span className="font-semibold">{formatDate(stats.oldestLogDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground block text-[10px]">Último chequeo registrado:</span>
                  <span className="font-semibold">{formatDate(stats.newestLogDate)}</span>
                </div>
              </div>
            </div>

            {/* Sección: Configuración de Política de Retención Automática */}
            <div className="p-3.5 rounded-xl border border-border/80 space-y-3 bg-card">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" /> Política de Retención Automática
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    El demonio en segundo plano purgará automáticamente los registros que superen esta antigüedad.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={selectedDays}
                  onChange={(e) => setSelectedDays(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-md border border-input bg-background text-xs outline-none flex-1 font-medium"
                >
                  <option value={7}>Conservar 7 días (Ideal para alto volumen)</option>
                  <option value={15}>Conservar 15 días (Recomendado)</option>
                  <option value={30}>Conservar 30 días (1 mes completo)</option>
                  <option value={60}>Conservar 60 días (2 meses)</option>
                  <option value={90}>Conservar 90 días (3 meses / Trimestre)</option>
                  <option value={180}>Conservar 180 días (Semestre)</option>
                  <option value={365}>Conservar 365 días (1 año)</option>
                </select>

                <Button
                  size="sm"
                  onClick={handleSaveRetentionPolicy}
                  disabled={savingPolicy}
                  className="h-8 text-xs whitespace-nowrap"
                >
                  {savingPolicy ? 'Guardando...' : 'Aplicar Política'}
                </Button>
              </div>
            </div>

            {/* Sección: Ejecución Inmediata de Limpieza */}
            <div className="p-3.5 rounded-xl border border-border/80 space-y-3 bg-muted/20">
              <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
                <Trash2 className="w-4 h-4 text-destructive" /> Acciones de Limpieza Inmediata
              </h4>

              {/* Botón Purga según días */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-background rounded-lg border">
                <div>
                  <div className="font-semibold text-xs">Depurar registros fuera de política</div>
                  <div className="text-[10px] text-muted-foreground">
                    Elimina {stats.expiredLogsCount.toLocaleString()} registros con más de {selectedDays} días.
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePurgeOldLogs}
                  disabled={actionLoading || stats.expiredLogsCount === 0}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Depurar Ahora
                </Button>
              </div>

              {/* Purga por servicio específico */}
              <div className="flex items-center justify-between gap-2 p-2.5 bg-background rounded-lg border flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-xs">Vaciar logs de un servicio</div>
                  <div className="text-[10px] text-muted-foreground">
                    Limpia todo el historial de comprobaciones de un servicio en particular.
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <select
                    value={selectedServiceToPurge}
                    onChange={(e) => setSelectedServiceToPurge(e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs outline-none max-w-[180px] truncate"
                  >
                    <option value="">Selecciona servicio...</option>
                    {services.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePurgeServiceLogs}
                    disabled={actionLoading || !selectedServiceToPurge}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Vaciar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
