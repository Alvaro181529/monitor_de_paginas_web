'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ServiceItem } from './service-card';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Filter, Calendar, X, ListFilter } from 'lucide-react';
import { toast } from 'sonner';

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceItem | null;
}

interface LogEntry {
  _id: string;
  status: 'up' | 'down' | 'degraded';
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
  createdAt: string;
}

export function HistoryDialog({ open, onOpenChange, service }: HistoryDialogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Estados de filtros
  const [limit, setLimit] = useState<number>(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/services/${service._id}?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.totalLogs ?? (data.logs?.length || 0));
      } else {
        toast.error('Error al cargar historial de logs');
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [service, limit, statusFilter, startDate, endDate]);

  useEffect(() => {
    if (open && service) {
      fetchLogs();
    }
  }, [open, service, fetchLogs]);

  const clearFilters = () => {
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setLimit(50);
  };

  const hasActiveFilters = statusFilter !== 'all' || startDate !== '' || endDate !== '' || limit !== 50;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'up':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 flex items-center gap-1 font-medium whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" /> UP
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 flex items-center gap-1 font-medium whitespace-nowrap">
            <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" /> LENTO
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 flex items-center gap-1 font-medium whitespace-nowrap">
            <XCircle className="w-2.5 h-2.5 flex-shrink-0" /> DOWN
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0.5 whitespace-nowrap">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-2xl max-h-[94vh] p-2.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3 overflow-hidden">
        {/* HEADER RESPONSIVO */}
        <DialogHeader className="pr-8 pb-1.5 border-b border-border/40 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <DialogTitle className="text-xs sm:text-base font-bold truncate">
                  Historial de Chequeos
                </DialogTitle>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 py-0">
                  {logs.length} {totalLogs > logs.length ? `de ${totalLogs}` : ''}
                </Badge>
              </div>
              <DialogDescription className="text-[10px] sm:text-xs truncate max-w-full text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{service?.name}</span> &bull; {service?.url}
              </DialogDescription>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
              <Button
                variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
              >
                <Filter className="w-3 h-3 flex-shrink-0" />
                <span>{showFilters ? 'Ocultar' : 'Filtros'}</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block ml-0.5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
              >
                <RefreshCw className={`w-3 h-3 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
                <span>Recargar</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* PANEL DE FILTROS COLAPSABLE Y COMPACTO EN PANTALLAS PEQUEÑAS */}
        {showFilters && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-2 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {/* Filtro por Cantidad de Muestra */}
              <div className="space-y-0.5">
                <label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <ListFilter className="w-2.5 h-2.5" /> Muestra
                </label>
                <select
                  aria-label="Cantidad de logs a mostrar"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full h-6 sm:h-7 rounded border border-input bg-background px-1.5 text-[10px] sm:text-xs outline-none focus:border-ring"
                >
                  <option value={15}>15 logs</option>
                  <option value={50}>50 logs</option>
                  <option value={100}>100 logs</option>
                  <option value={200}>200 logs</option>
                </select>
              </div>

              {/* Filtro por Estado */}
              <div className="space-y-0.5">
                <label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">Estado</label>
                <select
                  aria-label="Filtrar por estado HTTP"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-6 sm:h-7 rounded border border-input bg-background px-1.5 text-[10px] sm:text-xs outline-none focus:border-ring"
                >
                  <option value="all">Todos</option>
                  <option value="up">UP (OK)</option>
                  <option value="down">DOWN (Caídos)</option>
                  <option value="degraded">LENTOS</option>
                </select>
              </div>

              {/* Filtro Desde (Fecha) */}
              <div className="space-y-0.5">
                <label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> Desde
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 py-0"
                />
              </div>

              {/* Filtro Hasta (Fecha) */}
              <div className="space-y-0.5">
                <label className="text-[9px] sm:text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> Hasta
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 py-0"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-5 text-[9px] sm:text-[10px] px-1.5 text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-2.5 h-2.5" /> Restablecer filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* CONTENEDOR CON SCROLL BIDIRECCIONAL COMPLETO */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border border-border/60 rounded-lg min-w-0 bg-background max-h-[60vh] sm:max-h-[65vh]">
          <Table className="w-full text-[10px] sm:text-[11px] min-w-[340px]">
            <TableHeader className="bg-muted/70 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead className="w-28 sm:w-36 py-1.5 px-2 text-[10px] sm:text-[11px] font-semibold">Hora / Fecha</TableHead>
                <TableHead className="w-16 sm:w-20 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-semibold">Estado</TableHead>
                <TableHead className="w-12 sm:w-16 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-semibold">HTTP</TableHead>
                <TableHead className="w-16 sm:w-20 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-semibold">Latencia</TableHead>
                <TableHead className="py-1.5 px-2 text-[10px] sm:text-[11px] font-semibold">Diagnóstico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Cargando registros...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">No se encontraron registros</p>
                    <p className="text-[10px]">Prueba ampliando los filtros de fecha o estado.</p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                        className="text-[10px] h-auto p-0 text-primary mt-1"
                      >
                        Limpiar todos los filtros
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const logDate = new Date(log.createdAt);
                  const isToday = new Date().toDateString() === logDate.toDateString();
                  const formattedDate = isToday
                    ? logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : `${logDate.toLocaleDateString([], { month: '2-digit', day: '2-digit' })} ${logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <TableRow key={log._id} className="text-[10px] sm:text-[11px] hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-muted-foreground whitespace-nowrap py-1 sm:py-1.5 px-2">
                        {formattedDate}
                      </TableCell>
                      <TableCell className="py-1 sm:py-1.5 px-1.5">
                        {renderStatus(log.status)}
                      </TableCell>
                      <TableCell className="font-mono font-medium py-1 sm:py-1.5 px-1.5">
                        {log.statusCode || '—'}
                      </TableCell>
                      <TableCell className="font-mono py-1 sm:py-1.5 px-1.5 whitespace-nowrap text-muted-foreground">
                        {log.responseTime !== undefined ? `${log.responseTime} ms` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[110px] sm:max-w-xs truncate py-1 sm:py-1.5 px-2 text-[10px] sm:text-[11px]" title={log.errorMessage || 'OK'}>
                        {log.errorMessage || 'Correcto (OK)'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
