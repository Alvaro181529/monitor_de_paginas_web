import prisma from './prisma';
import { sendWebPushNotification } from './webpush';
import type { Service } from '@prisma/client';

export type ServiceStatus = 'up' | 'down' | 'degraded' | 'unknown';

export interface CheckResult {
  serviceId: string;
  name: string;
  url: string;
  status: ServiceStatus;
  statusCode?: number;
  responseTime: number;
  error?: string;
  previousStatus: string;
  statusChanged: boolean;
}

/**
 * Realiza la comprobación de estado de un servicio individual usando Prisma
 */
export async function checkService(serviceDocOrId: string | Service): Promise<CheckResult> {
  let service: Service | null = null;
  if (typeof serviceDocOrId === 'string') {
    service = await prisma.service.findUnique({ where: { id: serviceDocOrId } });
  } else {
    service = serviceDocOrId;
  }

  if (!service) {
    throw new Error('Servicio no encontrado');
  }

  const previousStatus = service.status;
  const timeoutMs = service.timeout || 10000;
  const expectedStatus = service.expectedStatus || 200;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  let statusCode: number | undefined;
  let responseTime = 0;
  let currentStatus: ServiceStatus = 'down';
  let errorMessage: string | undefined;

  try {
    const response = await fetch(service.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MonitorDeServicios/1.0 (HealthCheck)',
      },
      cache: 'no-store',
    });

    responseTime = Date.now() - startTime;
    statusCode = response.status;

    if (statusCode === expectedStatus || (expectedStatus === 200 && statusCode >= 200 && statusCode < 400)) {
      if (responseTime > 2000) {
        currentStatus = 'degraded';
      } else {
        currentStatus = 'up';
      }
    } else {
      currentStatus = 'down';
      errorMessage = `Código HTTP inesperado: ${statusCode} (esperado: ${expectedStatus})`;
    }
  } catch (err: unknown) {
    responseTime = Date.now() - startTime;
    currentStatus = 'down';

    const error = err as Error;
    if (error.name === 'AbortError') {
      errorMessage = `Tiempo de espera agotado (Timeout > ${timeoutMs}ms)`;
    } else {
      errorMessage = error.message || 'Error de conexión / Servidor no alcanzable';
    }
  } finally {
    clearTimeout(timer);
  }

  const statusChanged = previousStatus !== 'unknown' && previousStatus !== currentStatus;

  // Registrar en historial de logs con Prisma
  await prisma.checkLog.create({
    data: {
      serviceId: service.id,
      status: currentStatus,
      statusCode: statusCode ?? null,
      responseTime,
      errorMessage: errorMessage ?? null,
    },
  });

  // Calcular métricas actualizadas
  const totalChecks = (service.totalChecks || 0) + 1;
  const successfulChecks = (service.successfulChecks || 0) + (currentStatus === 'up' ? 1 : 0);
  const uptimePercent = Math.round((successfulChecks / totalChecks) * 1000) / 10;

  await prisma.service.update({
    where: { id: service.id },
    data: {
      status: currentStatus,
      statusCode: statusCode ?? null,
      responseTime,
      lastCheck: new Date(),
      lastError: errorMessage ?? null,
      totalChecks,
      successfulChecks,
      uptimePercent,
      ...(statusChanged || !service.lastStatusChange ? { lastStatusChange: new Date() } : {}),
    },
  });

  // Enviar notificación PUSH si cambió el estado
  if (statusChanged) {
    if (currentStatus === 'down') {
      await sendWebPushNotification({
        title: `Alerta: ${service.name} está CAÍDO`,
        body: `La página ${service.url} no responde. ${errorMessage || 'Error de conexión.'}`,
        url: '/',
        tag: `down-${service.id}`,
      });
    } else if (previousStatus === 'down' && currentStatus === 'up') {
      await sendWebPushNotification({
        title: `Recuperado: ${service.name} está EN LÍNEA`,
        body: `El servicio ${service.name} se ha restablecido exitosamente (${responseTime}ms).`,
        url: '/',
        tag: `up-${service.id}`,
      });
    } else if (currentStatus === 'degraded') {
      await sendWebPushNotification({
        title: `Advertencia: ${service.name} con ALTA LATENCIA`,
        body: `Tiempo de respuesta elevado: ${responseTime}ms en ${service.url}`,
        url: '/',
        tag: `degraded-${service.id}`,
      });
    }
  }

  return {
    serviceId: service.id,
    name: service.name,
    url: service.url,
    status: currentStatus,
    statusCode,
    responseTime,
    error: errorMessage,
    previousStatus,
    statusChanged,
  };
}

/**
 * Revisa todos los servicios activos en paralelo con Prisma
 */
export async function checkAllServices(): Promise<{
  total: number;
  results: CheckResult[];
  upCount: number;
  downCount: number;
  degradedCount: number;
}> {
  const services = await prisma.service.findMany({ where: { isActive: true } });

  const results = await Promise.all(
    services.map(async (srv) => {
      try {
        return await checkService(srv);
      } catch (err: unknown) {
        return {
          serviceId: srv.id,
          name: srv.name,
          url: srv.url,
          status: 'down' as ServiceStatus,
          responseTime: 0,
          error: (err as Error).message || 'Fallo al verificar',
          previousStatus: srv.status,
          statusChanged: false,
        };
      }
    })
  );

  const upCount = results.filter((r) => r.status === 'up').length;
  const downCount = results.filter((r) => r.status === 'down').length;
  const degradedCount = results.filter((r) => r.status === 'degraded').length;

  return {
    total: results.length,
    results,
    upCount,
    downCount,
    degradedCount,
  };
}
