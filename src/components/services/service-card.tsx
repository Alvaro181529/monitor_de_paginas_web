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
  Tag,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Server,
  Globe,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ServiceItem {
  _id: string;
  name: string;
  url: string;
  category?: string;
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
  checkType?: 'HTTP' | 'TCP' | 'SSL';
  port?: number;
  httpMethod?: string;
  headers?: string;
  keyword?: string;
  sslDaysRemaining?: number | null;
  sslExpiryDate?: string | null;
  sslIssuer?: string | null;
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
            <XCircle className="w-3 h-3 text-red-500" />
            Caído
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
            Pendiente
          </Badge>
        );
    }
  };

  const getLatencyColor = (latency?: number) => {
    if (latency === undefined || latency === null || latency === 0) return 'text-muted-foreground';
    if (latency < 400) return 'text-emerald-500';
    if (latency < 1200) return 'text-amber-500';
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

  const checkType = service.checkType || 'HTTP';

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md border border-border/70 hover:border-border w-full min-w-0">
      <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* Header con Nombre, URL, Categoría y Estado */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base truncate" title={service.name}>
                {service.name}
              </h3>

              {/* Badge de tipo de chequeo */}
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 flex items-center gap-1 flex-shrink-0 font-medium">
                {checkType === 'TCP' && (
                  <>
                    <Server className="w-2.5 h-2.5 text-blue-500" />
                    <span>TCP{service.port ? ` :${service.port}` : ''}</span>
                  </>
                )}
                {checkType === 'SSL' && (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    <span>SSL</span>
                  </>
                )}
                {checkType === 'HTTP' && (
                  <>
                    <Globe className="w-2.5 h-2.5 text-emerald-500" />
                    <span>HTTP</span>
                  </>
                )}
              </Badge>

              {/* Categoría */}
              {service.category && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border/70 flex items-center gap-1 flex-shrink-0">
                  <Tag className="w-2.5 h-2.5 text-primary" />
                  {service.category}
                </Badge>
              )}

              {/* Badge de Días SSL */}
              {service.sslDaysRemaining !== null && service.sslDaysRemaining !== undefined && (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 flex items-center gap-1 flex-shrink-0 ${
                    service.sslDaysRemaining > 15
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : service.sslDaysRemaining > 0
                      ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                      : 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10'
                  }`}
                  title={`Certificado SSL: ${service.sslDaysRemaining} días restantes (${service.sslIssuer || 'CA'})`}
                >
                  {service.sslDaysRemaining > 15 ? (
                    <ShieldCheck className="w-2.5 h-2.5" />
                  ) : service.sslDaysRemaining > 0 ? (
                    <ShieldAlert className="w-2.5 h-2.5" />
                  ) : (
                    <ShieldX className="w-2.5 h-2.5" />
                  )}
                  <span>SSL: {service.sslDaysRemaining}d</span>
                </Badge>
              )}

              {!service.isActive && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 flex-shrink-0">
                  Off
                </Badge>
              )}
            </div>

            <a
              href={checkType === 'HTTP' ? service.url : `http://${service.url}`}
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
            <div className="text-[10px] text-muted-foreground truncate">
              {checkType === 'TCP' ? 'Puerto' : checkType === 'SSL' ? 'Validez' : 'HTTP'}
            </div>
            <div className="font-semibold text-xs sm:text-sm truncate">
              {checkType === 'TCP' ? (
                <span className="text-blue-500 font-mono">:{service.port || '80'}</span>
              ) : checkType === 'SSL' ? (
                <span className={service.sslDaysRemaining && service.sslDaysRemaining > 15 ? 'text-emerald-500' : 'text-amber-500'}>
                  {service.sslDaysRemaining ? `${service.sslDaysRemaining}d` : '—'}
                </span>
              ) : service.statusCode ? (
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

        {/* Mensaje de error si está caído o degradado */}
        {service.lastError && (service.status === 'down' || service.status === 'degraded') && (
          <div className={`text-[11px] p-2 rounded-md flex items-start gap-1.5 min-w-0 ${
            service.status === 'down' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="truncate flex-1">{service.lastError}</span>
          </div>
        )}

        {/* Barra de Uptime Visual (Últimos 15 chequeos) */}
        <div className="space-y-1 min-w-0">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Últimos chequeos</span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(service.lastCheck)}
            </span>
          </div>
          <div className="flex gap-1 h-3.5 sm:h-4 items-center min-w-0">
            {service.recentLogs && service.recentLogs.length > 0 ? (
              service.recentLogs.map((log, idx) => (
                <div
                  key={log._id || idx}
                  className={`flex-1 h-full rounded-[2px] transition-all hover:opacity-80 min-w-0 ${
                    log.status === 'up'
                      ? 'bg-emerald-500'
                      : log.status === 'degraded'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  title={`${log.status.toUpperCase()} - ${log.responseTime || 0}ms (${new Date(
                    log.createdAt
                  ).toLocaleTimeString()})`}
                />
              ))
            ) : (
              <div className="w-full h-full bg-muted/40 rounded flex items-center justify-center text-[9px] text-muted-foreground">
                Sin datos aún
              </div>
            )}
          </div>
        </div>

        {/* Footer y Acciones */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickCheck}
            disabled={checking}
            className="h-7 px-2 text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title="Comprobar ahora"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden xs:inline">Probar</span>
          </Button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewHistory(service)}
              className="h-7 px-2 text-[11px] flex items-center gap-1 text-muted-foreground hover:text-primary"
              title="Historial de logs"
            >
              <History className="w-3 h-3" />
              <span className="hidden xs:inline">Historial</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(service)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Editar"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(service._id, service.name)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
