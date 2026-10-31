import prisma from './prisma';
import { sendWebPushNotification } from './webpush';
import type { Service } from '@prisma/client';
import * as net from 'node:net';
import * as tls from 'node:tls';

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
  checkType?: string;
  sslDaysRemaining?: number | null;
}

/**
 * Parsea un host y puerto desde una URL o cadena host:puerto
 */
export function parseHostAndPort(rawUrl: string, defaultPort: number = 80): { host: string; port: number } {
  let cleaned = rawUrl.trim();
  cleaned = cleaned.replace(/^[a-zA-Z]+:\/\//, ''); // Quitar protocolo
  cleaned = cleaned.split('/')[0]; // Quitar rutas
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    return {
      host: parts[0],
      port: parseInt(parts[1], 10) || defaultPort,
    };
  }
  return { host: cleaned, port: defaultPort };
}

/**
 * Comprueba conexión a un puerto TCP
 */
export async function checkTcpPort(
  host: string,
  port: number,
  timeoutMs: number = 10000
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isResolved = false;
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: `Tiempo de espera TCP agotado en ${host}:${port} (> ${timeoutMs}ms)`,
        });
      }
    }, timeoutMs);

    socket.connect(port, host, () => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      const responseTime = Date.now() - startTime;
      socket.end();
      resolve({ success: true, responseTime });
    });

    socket.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({
        success: false,
        responseTime: Date.now() - startTime,
        error: `Conexión TCP rechazada en ${host}:${port}: ${err.message}`,
      });
    });
  });
}

/**
 * Comprueba el estado y días de validez del certificado SSL/TLS
 */
export async function checkSslCertificate(
  host: string,
  port: number = 443,
  timeoutMs: number = 10000
): Promise<{
  valid: boolean;
  daysRemaining: number;
  expiryDate?: Date;
  issuer?: string;
  responseTime: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isResolved = false;
    const cleanHost = host.replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].split(':')[0];

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        try {
          socket.destroy();
        } catch {}
        resolve({
          valid: false,
          daysRemaining: 0,
          responseTime: Date.now() - startTime,
          error: `Tiempo de espera SSL agotado en ${cleanHost}:${port} (> ${timeoutMs}ms)`,
        });
      }
    }, timeoutMs);

    const socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost,
        rejectUnauthorized: false,
      },
      () => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timer);
        const responseTime = Date.now() - startTime;
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || !cert.valid_to) {
          resolve({
            valid: false,
            daysRemaining: 0,
            responseTime,
            error: 'No se obtuvo certificado SSL/TLS del host remoto',
          });
          return;
        }

        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let issuerStr = 'Desconocido';
        if (cert.issuer) {
          if (typeof cert.issuer === 'object') {
            const rawO = cert.issuer.O;
            const rawCN = cert.issuer.CN;
            const oStr = Array.isArray(rawO) ? rawO.join(', ') : rawO;
            const cnStr = Array.isArray(rawCN) ? rawCN.join(', ') : rawCN;
            issuerStr = oStr || cnStr || 'CA';
          } else {
            issuerStr = String(cert.issuer);
          }
        }

        resolve({
          valid: daysRemaining > 0,
          daysRemaining,
          expiryDate,
          issuer: issuerStr,
          responseTime,
        });
      }
    );

    socket.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
      resolve({
        valid: false,
        daysRemaining: 0,
        responseTime: Date.now() - startTime,
        error: `Fallo SSL/TLS en ${cleanHost}:${port}: ${err.message}`,
      });
    });
  });
}

/**
 * Realiza la comprobación de estado de un servicio individual (HTTP, TCP o SSL)
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
  const checkType = service.checkType || 'HTTP';

  let statusCode: number | undefined;
  let responseTime = 0;
  let currentStatus: ServiceStatus = 'down';
  let errorMessage: string | undefined;
  let logDetails: string | undefined;

  let sslDaysRemaining: number | null = service.sslDaysRemaining ?? null;
  let sslExpiryDate: Date | null = service.sslExpiryDate ?? null;
  let sslIssuer: string | null = service.sslIssuer ?? null;

  if (checkType === 'TCP') {
    // Chequeo de Puerto TCP (Bases de datos, PACS, Servidores, etc.)
    const { host, port } = parseHostAndPort(service.url, service.port || 80);
    const tcpResult = await checkTcpPort(host, service.port || port, timeoutMs);
    responseTime = tcpResult.responseTime;

    if (tcpResult.success) {
      currentStatus = responseTime > 2000 ? 'degraded' : 'up';
      logDetails = `Puerto TCP ${service.port || port} respondiendo en ${responseTime}ms`;
    } else {
      currentStatus = 'down';
      errorMessage = tcpResult.error || 'Conexión TCP no alcanzable';
    }
  } else if (checkType === 'SSL') {
    // Chequeo de Expiración de Certificado SSL / TLS
    const { host, port } = parseHostAndPort(service.url, service.port || 443);
    const sslResult = await checkSslCertificate(host, service.port || port, timeoutMs);
    responseTime = sslResult.responseTime;

    if (!sslResult.valid || sslResult.error) {
      currentStatus = 'down';
      errorMessage = sslResult.error || `Certificado SSL expirado (${sslResult.daysRemaining} días)`;
    } else if (sslResult.daysRemaining <= 15) {
      currentStatus = 'degraded';
      errorMessage = `Certificado SSL expira en ${sslResult.daysRemaining} días (${sslResult.issuer})`;
      logDetails = `Certificado próximo a vencer: ${sslResult.daysRemaining} días restantes`;
    } else {
      currentStatus = 'up';
      logDetails = `Certificado SSL válido: ${sslResult.daysRemaining} días restantes (${sslResult.issuer})`;
    }

    if (sslResult.expiryDate) {
      sslDaysRemaining = sslResult.daysRemaining;
      sslExpiryDate = sslResult.expiryDate;
      sslIssuer = sslResult.issuer || null;
    }
  } else {
    // Chequeo HTTP / HTTPS
    const expectedStatus = service.expectedStatus || 200;
    const httpMethod = service.httpMethod || 'GET';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();

    // Cabeceras personalizadas
    const customHeaders: Record<string, string> = {
      'User-Agent': 'MonitorDeServicios/2.0 (HealthCheck)',
    };
    if (service.headers) {
      try {
        const parsed = JSON.parse(service.headers);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(customHeaders, parsed);
        }
      } catch {
        // En caso de texto simple o cabeceras clave: valor
      }
    }

    try {
      const response = await fetch(service.url, {
        method: httpMethod,
        signal: controller.signal,
        headers: customHeaders,
        cache: 'no-store',
      });

      responseTime = Date.now() - startTime;
      statusCode = response.status;

      const isStatusOk =
        statusCode === expectedStatus ||
        (expectedStatus === 200 && statusCode >= 200 && statusCode < 400);

      if (isStatusOk) {
        // Validar palabra clave si está configurada
        if (service.keyword && service.keyword.trim()) {
          const bodyText = await response.text();
          if (!bodyText.includes(service.keyword.trim())) {
            currentStatus = 'down';
            errorMessage = `Palabra clave no encontrada en respuesta: "${service.keyword.trim()}"`;
          } else {
            currentStatus = responseTime > 2000 ? 'degraded' : 'up';
            logDetails = `Palabra clave "${service.keyword.trim()}" verificada`;
          }
        } else {
          currentStatus = responseTime > 2000 ? 'degraded' : 'up';
        }
      } else {
        currentStatus = 'down';
        errorMessage = `Código HTTP inesperado: ${statusCode} (esperado: ${expectedStatus})`;
      }

      // Si la URL es HTTPS, verificar también certificado SSL en segundo plano
      if (service.url.toLowerCase().startsWith('https://')) {
        const { host } = parseHostAndPort(service.url, 443);
        checkSslCertificate(host, 443, 4000)
          .then((ssl) => {
            if (ssl.valid && ssl.expiryDate) {
              prisma.service
                .update({
                  where: { id: service!.id },
                  data: {
                    sslDaysRemaining: ssl.daysRemaining,
                    sslExpiryDate: ssl.expiryDate,
                    sslIssuer: ssl.issuer || null,
                  },
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
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
      checkType,
      details: logDetails ?? null,
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
      ...(sslDaysRemaining !== null ? { sslDaysRemaining, sslExpiryDate, sslIssuer } : {}),
      ...(statusChanged || !service.lastStatusChange ? { lastStatusChange: new Date() } : {}),
    },
  });

  // Enviar notificación PUSH si cambió el estado
  if (statusChanged) {
    if (currentStatus === 'down') {
      await sendWebPushNotification({
        title: `Alerta: ${service.name} está CAÍDO [${checkType}]`,
        body: `${service.url} no responde. ${errorMessage || 'Fallo de comprobación.'}`,
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
        title: `Advertencia: ${service.name} DEGRADADO`,
        body: errorMessage || `Latencia elevada: ${responseTime}ms en ${service.url}`,
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
    checkType,
    sslDaysRemaining,
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
          checkType: srv.checkType,
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
