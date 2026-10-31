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
import { Input } from '@/components/ui/input';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server,
  Download,
  Filter,
  Maximize2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  services: { _id: string; name: string; category?: string }[];
}

interface SlaSummary {
  id: string;
  name: string;
  url: string;
  category: string;
  checkType: string;
  currentStatus: string;
  uptimePercent: number;
  totalChecks: number;
  upChecks: number;
  downChecks: number;
  degradedChecks: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  incidents: number;
  downtimeMinutes: number;
  sslDaysRemaining?: number | null;
}

interface ReportData {
  reportType: string;
  period: { name: string; from: string; to: string };
  global: {
    totalServices: number;
    globalUptime: number;
    totalIncidents: number;
    avgGlobalLatency: number;
  };
  services: SlaSummary[];
}

export function ReportsDialog({
  open,
  onOpenChange,
  categories,
  services,
}: ReportsDialogProps) {
  const [reportType, setReportType] = useState<'sla' | 'logs'>('sla');
  const [period, setPeriod] = useState<string>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const fetchReportData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      params.append('format', 'json');
      params.append('period', period);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedService !== 'all') params.append('serviceId', selectedService);
      if (period === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      } else {
        toast.error(`Error al generar reporte: ${data.error}`);
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [open, reportType, period, selectedCategory, selectedService, startDate, endDate]);

  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, fetchReportData]);

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    params.append('type', reportType);
    params.append('format', 'csv');
    params.append('period', period);
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (selectedService !== 'all') params.append('serviceId', selectedService);
    if (period === 'custom') {
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
    }

    const downloadUrl = `/api/reports?${params.toString()}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `reporte-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descargando archivo CSV...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[96vw] !max-w-6xl !h-[92vh] max-h-[95vh] p-3 sm:p-6 flex flex-col gap-3 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="pr-8 pb-2 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-xl font-bold tracking-tight">
                  Exportación y Reportes Periódicos
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  SLA & Compliance
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Genera reportes ejecutivos de disponibilidad, métricas de SLA y auditoría exportables a Excel y PDF.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Panel de Filtros y Configuración del Reporte */}
        <div className="p-3 sm:p-4 bg-muted/40 rounded-xl border border-border/70 space-y-3 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Tipo de Reporte */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Tipo de Reporte</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'sla' | 'logs')}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs outline-none focus:border-ring transition-colors font-medium"
              >
                <option value="sla">Resumen Ejecutivo SLA</option>
                <option value="logs">Auditoría Detallada de Logs</option>
              </select>
            </div>

            {/* Período */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Período de Tiempo</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs outline-none focus:border-ring transition-colors font-medium"
              >
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="custom">Rango Personalizado</option>
              </select>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs outline-none focus:border-ring transition-colors"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Servicio Específico */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Servicio</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs outline-none focus:border-ring transition-colors"
              >
                <option value="all">Todos los servicios</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de fechas personalizado si aplica */}
          {period === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-border/40">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3 text-primary" /> Fecha Inicial
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3 text-primary" /> Fecha Final
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
          )}

          {/* Botones de acción de exportación */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>
                {period === '24h'
                  ? 'Ventana: 24 horas'
                  : period === '7d'
                  ? 'Ventana: 7 días'
                  : period === '30d'
                  ? 'Ventana: 30 días'
                  : 'Rango personalizado'}
              </span>
              {reportData && (
                <span className="hidden sm:inline text-foreground font-medium">
                  &bull; {reportData.services.length} servicios procesados
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs flex items-center gap-1.5 font-medium"
                title="Imprimir o guardar como documento PDF"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Imprimir / PDF</span>
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadCsv}
                className="h-8 text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                title="Descargar en formato CSV compatible con Microsoft Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar CSV (Excel)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Vista Previa del Reporte con scroll interno dedicado */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-3.5">
          {loading ? (
            <div className="text-center py-16 space-y-2.5">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Calculando métricas del período...</p>
            </div>
          ) : reportData && reportType === 'sla' ? (
            <div className="space-y-4 print:p-4">
              {/* Tarjetas Resumen Global */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Disponibilidad Global
                  </span>
                  <div
                    className={`text-2xl sm:text-3xl font-black ${
                      reportData.global.globalUptime >= 99
                        ? 'text-emerald-500'
                        : reportData.global.globalUptime >= 95
                        ? 'text-amber-500'
                        : 'text-red-500'
                    }`}
                  >
                    {reportData.global.globalUptime}%
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block">Cumplimiento SLA</span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Total Servicios
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-foreground">
                    {reportData.global.totalServices}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block">Servicios Evaluados</span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Incidentes de Caída
                  </span>
                  <div
                    className={`text-2xl sm:text-3xl font-black ${
                      reportData.global.totalIncidents === 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {reportData.global.totalIncidents}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block">Interrupciones de servicio</span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Latencia Promedio
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-primary">
                    {reportData.global.avgGlobalLatency} ms
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium block">Tiempo medio de respuesta</span>
                </div>
              </div>

              {/* Tabla Detallada de Servicios */}
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[760px]">
                    <thead className="bg-muted/80 text-[10px] uppercase font-semibold text-muted-foreground border-b border-border/70">
                      <tr>
                        <th className="px-3.5 py-2.5">Servicio / Categoría</th>
                        <th className="px-2.5 py-2.5 text-center">Tipo</th>
                        <th className="px-2.5 py-2.5 text-center">Disponibilidad (SLA)</th>
                        <th className="px-2.5 py-2.5 text-center">Latencia Media</th>
                        <th className="px-2.5 py-2.5 text-center">Incidentes</th>
                        <th className="px-2.5 py-2.5 text-center">Downtime Estimado</th>
                        <th className="px-3 py-2.5 text-center">Certificado SSL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reportData.services && reportData.services.length > 0 ? (
                        reportData.services.map((srv) => (
                          <tr key={srv.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-3.5 py-3">
                              <div className="font-semibold text-foreground truncate max-w-[240px]">
                                {srv.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                  {srv.category}
                                </Badge>
                                <span className="truncate max-w-[160px] font-mono">{srv.url}</span>
                              </div>
                            </td>

                            <td className="px-2.5 py-3 text-center">
                              <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-mono font-medium">
                                {srv.checkType}
                              </Badge>
                            </td>

                            <td className="px-2.5 py-3 text-center">
                              <div
                                className={`font-bold text-sm ${
                                  srv.uptimePercent >= 99
                                    ? 'text-emerald-500'
                                    : srv.uptimePercent >= 95
                                    ? 'text-amber-500'
                                    : 'text-red-500'
                                }`}
                              >
                                {srv.uptimePercent.toFixed(1)}%
                              </div>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {srv.upChecks}/{srv.totalChecks} ok
                              </div>
                            </td>

                            <td className="px-2.5 py-3 text-center">
                              <div className="font-semibold text-foreground">{srv.avgLatency} ms</div>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {srv.minLatency} - {srv.maxLatency} ms
                              </div>
                            </td>

                            <td className="px-2.5 py-3 text-center">
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                                  srv.incidents > 0
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-emerald-500/10 text-emerald-500'
                                }`}
                              >
                                {srv.incidents}
                              </span>
                            </td>

                            <td className="px-2.5 py-3 text-center">
                              <span className="font-medium text-muted-foreground">
                                {srv.downtimeMinutes > 0 ? `${srv.downtimeMinutes} min` : '0 min'}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              {srv.sslDaysRemaining !== null && srv.sslDaysRemaining !== undefined ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-2 py-0.5 font-medium ${
                                    srv.sslDaysRemaining > 15
                                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                      : 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                                  }`}
                                >
                                  {srv.sslDaysRemaining} días
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                            No se encontraron servicios ni métricas para el filtro seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-muted/20 rounded-2xl border border-dashed border-border/80 text-center space-y-3 my-4">
              <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-semibold text-sm">Auditoría Detallada de Logs Lista para Exportación</h4>
                <p className="text-xs text-muted-foreground">
                  Para analizar a fondo cada uno de los miles de registros de chequeo, haz clic en el botón superior{' '}
                  <strong className="text-foreground">Descargar CSV (Excel)</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
