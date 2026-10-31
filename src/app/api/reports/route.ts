import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sla'; // 'sla' | 'logs'
    const format = searchParams.get('format') || 'json'; // 'json' | 'csv'
    const period = searchParams.get('period') || '7d';
    const serviceId = searchParams.get('serviceId');
    const category = searchParams.get('category');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Determinar ventana de tiempo
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (period === '24h') {
      fromDate.setHours(now.getHours() - 24);
    } else if (period === '7d') {
      fromDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      fromDate.setDate(now.getDate() - 30);
    } else if (period === 'custom' && startDateParam) {
      fromDate = new Date(startDateParam);
      if (endDateParam) {
        toDate = new Date(endDateParam);
        // Si no tiene hora explícita, cubrir todo el día hasta 23:59:59
        if (endDateParam.length === 10) {
          toDate.setHours(23, 59, 59, 999);
        }
      }
    } else {
      fromDate.setDate(now.getDate() - 7); // Default 7d
    }

    // Filtrar servicios
    const serviceWhere: Record<string, unknown> = {};
    if (serviceId && serviceId !== 'all') {
      serviceWhere.id = serviceId;
    }
    if (category && category !== 'all') {
      serviceWhere.category = category;
    }

    const services = await prisma.service.findMany({
      where: serviceWhere,
      orderBy: { name: 'asc' },
    });

    if (type === 'sla') {
      // Reporte de SLA / Disponibilidad
      const serviceSummaries = await Promise.all(
        services.map(async (srv) => {
          const logs = await prisma.checkLog.findMany({
            where: {
              serviceId: srv.id,
              createdAt: {
                gte: fromDate,
                lte: toDate,
              },
            },
            orderBy: { createdAt: 'asc' },
          });

          const totalChecks = logs.length;
          const upChecks = logs.filter((l) => l.status === 'up').length;
          const downChecks = logs.filter((l) => l.status === 'down').length;
          const degradedChecks = logs.filter((l) => l.status === 'degraded').length;

          const uptimePercent =
            totalChecks > 0 ? Math.round((upChecks / totalChecks) * 1000) / 10 : 100.0;

          // Latencias de chequeos que respondieron
          const latencies = logs
            .filter((l) => l.responseTime !== null && l.responseTime !== undefined && l.status !== 'down')
            .map((l) => l.responseTime as number);

          const avgLatency =
            latencies.length > 0
              ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
              : 0;
          const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
          const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

          // Contar incidentes (transiciones a estado 'down')
          let incidents = 0;
          let inDowntime = false;
          let downtimeMinutes = 0;
          let downStartTime: Date | null = null;

          for (const log of logs) {
            if (log.status === 'down') {
              if (!inDowntime) {
                incidents++;
                inDowntime = true;
                downStartTime = log.createdAt;
              }
            } else if (inDowntime) {
              inDowntime = false;
              if (downStartTime) {
                const diffMs = log.createdAt.getTime() - downStartTime.getTime();
                downtimeMinutes += Math.round(diffMs / 60000);
                downStartTime = null;
              }
            }
          }

          // Si terminó el periodo y sigue caído
          if (inDowntime && downStartTime) {
            const diffMs = toDate.getTime() - downStartTime.getTime();
            downtimeMinutes += Math.round(diffMs / 60000);
          }

          return {
            id: srv.id,
            name: srv.name,
            url: srv.url,
            category: srv.category || 'General',
            checkType: srv.checkType || 'HTTP',
            currentStatus: srv.status,
            uptimePercent,
            totalChecks,
            upChecks,
            downChecks,
            degradedChecks,
            avgLatency,
            minLatency,
            maxLatency,
            incidents,
            downtimeMinutes,
            sslDaysRemaining: srv.sslDaysRemaining,
            sslIssuer: srv.sslIssuer,
          };
        })
      );

      // Métricas globales del sistema
      const totalServices = serviceSummaries.length;
      const globalUptime =
        totalServices > 0
          ? Math.round(
              (serviceSummaries.reduce((acc, s) => acc + s.uptimePercent, 0) / totalServices) * 10
            ) / 10
          : 100;
      const totalIncidents = serviceSummaries.reduce((acc, s) => acc + s.incidents, 0);
      const avgGlobalLatency =
        totalServices > 0
          ? Math.round(
              serviceSummaries.reduce((acc, s) => acc + s.avgLatency, 0) / totalServices
            )
          : 0;

      if (format === 'csv') {
        const csvRows: string[] = [];
        // Encabezados con BOM UTF-8
        csvRows.push(
          'Servicio,Categoría,Tipo Chequeo,Objetivo / URL,Estado Actual,Disponibilidad (SLA %),Chequeos Totales,Exitosos,Fallos,Degradados,Latencia Media (ms),Latencia Mín (ms),Latencia Máx (ms),Incidentes Caída,Tiempo Caído Estimado (min),Días SSL'
        );

        for (const s of serviceSummaries) {
          csvRows.push(
            [
              `"${s.name.replace(/"/g, '""')}"`,
              `"${s.category.replace(/"/g, '""')}"`,
              `"${s.checkType}"`,
              `"${s.url.replace(/"/g, '""')}"`,
              `"${s.currentStatus}"`,
              s.uptimePercent.toFixed(1),
              s.totalChecks,
              s.upChecks,
              s.downChecks,
              s.degradedChecks,
              s.avgLatency,
              s.minLatency,
              s.maxLatency,
              s.incidents,
              s.downtimeMinutes,
              s.sslDaysRemaining !== null && s.sslDaysRemaining !== undefined ? s.sslDaysRemaining : 'N/A',
            ].join(',')
          );
        }

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="reporte-sla-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        reportType: 'sla',
        period: {
          name: period,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        global: {
          totalServices,
          globalUptime,
          totalIncidents,
          avgGlobalLatency,
        },
        services: serviceSummaries,
      });
    } else {
      // Reporte detallado de logs
      const targetServiceIds = services.map((s) => s.id);
      const logs = await prisma.checkLog.findMany({
        where: {
          serviceId: { in: targetServiceIds },
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3000,
        include: {
          service: {
            select: {
              name: true,
              category: true,
              url: true,
              checkType: true,
            },
          },
        },
      });

      if (format === 'csv') {
        const csvRows: string[] = [];
        csvRows.push(
          'Fecha y Hora,Servicio,Categoría,Tipo Chequeo,Estado,Código HTTP,Latencia (ms),Detalle / Error'
        );

        for (const log of logs) {
          const dateStr = log.createdAt.toLocaleString('es-ES', { timeZone: 'America/La_Paz' });
          const errorMsg = (log.errorMessage || log.details || '').replace(/"/g, '""');
          csvRows.push(
            [
              `"${dateStr}"`,
              `"${(log.service?.name || '').replace(/"/g, '""')}"`,
              `"${(log.service?.category || 'General').replace(/"/g, '""')}"`,
              `"${log.checkType || log.service?.checkType || 'HTTP'}"`,
              `"${log.status.toUpperCase()}"`,
              log.statusCode ?? 'N/A',
              log.responseTime ?? 0,
              `"${errorMsg}"`,
            ].join(',')
          );
        }

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="auditoria-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        reportType: 'logs',
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
        count: logs.length,
        logs: logs.map((l) => ({
          id: l.id,
          createdAt: l.createdAt.toISOString(),
          serviceName: l.service?.name,
          category: l.service?.category,
          status: l.status,
          statusCode: l.statusCode,
          responseTime: l.responseTime,
          errorMessage: l.errorMessage,
          details: l.details,
          checkType: l.checkType || l.service?.checkType || 'HTTP',
        })),
      });
    }
  } catch (error: unknown) {
    console.error('Error en GET /api/reports:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
