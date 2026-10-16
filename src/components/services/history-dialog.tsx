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
import { ServiceItem } from './service-card';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!service) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${service._id}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        toast.error('Error al cargar historial de logs');
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (open && service) {
      fetchLogs();
    }
  }, [open, service, fetchLogs]);

  const renderStatus = (status: string) => {
    switch (status) {
      case 'up':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> UP
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0.5 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> LENTO
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px] px-1.5 py-0.5 flex items-center gap-1">
            <XCircle className="w-2.5 h-2.5" /> DOWN
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] p-3 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 gap-2 min-w-0 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm sm:text-base truncate">Historial de Comprobaciones</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs truncate">
              {service?.name} &bull; {service?.url}
            </DialogDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-7 px-2 text-[11px] flex items-center gap-1 flex-shrink-0 mr-6"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualizar</span>
          </Button>
        </DialogHeader>

        {/* CONTENEDOR DE LA TABLA CON SCROLL HORIZONTAL EN MÓVIL */}
        <div className="flex-1 overflow-auto border rounded-lg min-w-0">
          <Table className="w-full text-[11px]">
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead className="w-28 text-[11px] py-2 px-2">Hora</TableHead>
                <TableHead className="w-20 text-[11px] py-2 px-2">Estado</TableHead>
                <TableHead className="w-16 text-[11px] py-2 px-2">HTTP</TableHead>
                <TableHead className="w-20 text-[11px] py-2 px-2">Latencia</TableHead>
                <TableHead className="text-[11px] py-2 px-2">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    Cargando registros...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    Sin registros todavía.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id} className="text-[11px]">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap py-1.5 px-2">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell className="py-1.5 px-2">{renderStatus(log.status)}</TableCell>
                    <TableCell className="font-mono font-medium py-1.5 px-2">
                      {log.statusCode || '—'}
                    </TableCell>
                    <TableCell className="font-mono py-1.5 px-2 whitespace-nowrap">
                      {log.responseTime !== undefined ? `${log.responseTime} ms` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[120px] sm:max-w-xs truncate py-1.5 px-2" title={log.errorMessage}>
                      {log.errorMessage || 'OK'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
