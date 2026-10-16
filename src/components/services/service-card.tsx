'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  RefreshCw,
  Clock,
  History,
  Pencil,
  Trash2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ServiceItem {
  _id: string;
  name: string;
  url: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  statusCode?: number;
  responseTime?: number;
  checkInterval: number;
  expectedStatus: number;
  timeout: number;
  lastCheck?: string;
  lastStatusChange?: string;
  lastError?: string;
  uptimePercent: number;
  totalChecks: number;
  successfulChecks: number;
  isActive: boolean;
  tags?: string[];
  recentLogs?: Array<{
    _id: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    createdAt: string;
  }>;
}

interface ServiceCardProps {
  service: ServiceItem;
  onRefresh: () => void;
  onViewHistory: (service: ServiceItem) => void;
  onEdit: (service: ServiceItem) => void;
  onDelete: (id: string, name: string) => void;
}

export function ServiceCard({
  service,
  onRefresh,
  onViewHistory,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  const [checking, setChecking] = useState(false);

  const handleQuickCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/services/${service._id}/check`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${service.name}: ${data.result.status.toUpperCase()} (${data.result.responseTime}ms)`
        );
        onRefresh();
      } else {
        toast.error(`Error verificando ${service.name}: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Fallo de conexión: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = () => {
    switch (service.status) {
      case 'up':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1 font-semibold flex-shrink-0">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
            </span>
            Operativo
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1 font-semibold flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Lento
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20 text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1 font-semibold flex-shrink-0">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
            </span>
            Caído
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1 text-muted-foreground flex-shrink-0">
            <HelpCircle className="w-3 h-3" />
            Pendiente
          </Badge>
        );
    }
  };

  const getLatencyColor = (latency?: number) => {
    if (!latency) return 'text-muted-foreground';
    if (latency < 250) return 'text-emerald-500';
    if (latency < 800) return 'text-blue-500';
    if (latency < 1800) return 'text-amber-500';
    return 'text-red-500';
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 10) return 'Reciente';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md border border-border/70 hover:border-border w-full min-w-0">
      <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* Header con Nombre, URL y Estado */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate" title={service.name}>
                {service.name}
              </h3>
              {!service.isActive && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 flex-shrink-0">
                  Off
                </Badge>
              )}
            </div>

            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 min-w-0 group"
              title={service.url}
            >
              <span className="truncate">{service.url}</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
            </a>
          </div>

          <div className="flex-shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Indicadores de Rendimiento */}
        <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-muted/40 rounded-lg text-center border border-border/40 min-w-0">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground truncate">HTTP</div>
            <div className="font-semibold text-xs sm:text-sm truncate">
              {service.statusCode ? (
                <span
                  className={
                    service.statusCode >= 200 && service.statusCode < 400
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }
                >
                  {service.statusCode}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground truncate">Latencia</div>
            <div className={`font-semibold text-xs sm:text-sm truncate ${getLatencyColor(service.responseTime)}`}>
              {service.responseTime !== undefined && service.responseTime !== null
                ? `${service.responseTime} ms`
                : '—'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground truncate">Uptime</div>
            <div className="font-semibold text-xs sm:text-sm text-foreground truncate">
              {service.uptimePercent !== undefined ? `${service.uptimePercent}%` : '100%'}
            </div>
          </div>
        </div>

        {/* Mensaje de error si está caído */}
        {service.status === 'down' && service.lastError && (
          <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-start gap-1.5 min-w-0">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-all">{service.lastError}</span>
          </div>
        )}

        {/* Mini historial gráfico (Sparkline) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Historial</span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(service.lastCheck)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 h-3 w-full bg-muted/30 p-0.5 rounded overflow-hidden">
            {service.recentLogs && service.recentLogs.length > 0 ? (
              service.recentLogs.map((log, i) => {
                let color = 'bg-emerald-500';
                if (log.status === 'down') color = 'bg-red-500';
                else if (log.status === 'degraded') color = 'bg-amber-500';

                return (
                  <div
                    key={log._id || i}
                    className={`flex-1 h-full rounded-xs ${color} transition-all hover:opacity-80`}
                    title={`${new Date(log.createdAt).toLocaleTimeString()} - ${log.status.toUpperCase()} (${log.responseTime || 0}ms)`}
                  />
                );
              })
            ) : (
              <div className="w-full text-[9px] text-center text-muted-foreground">
                Sin registros
              </div>
            )}
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickCheck}
              disabled={checking}
              className="h-7 px-2 text-[11px] flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              <span>Verificar</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(service)}
              className="h-7 px-1.5 text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <History className="w-3 h-3" />
              <span>Logs</span>
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(service)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(service._id, service.name)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
