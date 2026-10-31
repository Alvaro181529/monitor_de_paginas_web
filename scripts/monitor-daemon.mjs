#!/usr/bin/env node

/**
 * Daemon de Monitoreo Continuo en Segundo Plano con Prisma y MongoDB
 * Soporte para:
 *   - Chequeos HTTP/HTTPS avanzados (métodos, cabeceras, palabras clave, SSL)
 *   - Chequeos de Puertos TCP (Bases de datos, PACS, Servidores)
 *   - Chequeos de Certificados SSL/TLS (Días restantes, alertas por expiración)
 *   - Limpieza automática periódica de logs según política de retención configurable.
 *
 * Uso:
 *   node scripts/monitor-daemon.mjs
 *   npm run monitor
 */

import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import dotenv from 'dotenv';
import net from 'node:net';
import tls from 'node:tls';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../.env.local') });

const prisma = new PrismaClient();

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@monitordeservicios.local';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

let lastCleanup = 0;

function parseHostAndPort(rawUrl, defaultPort = 80) {
  let cleaned = String(rawUrl || '').trim();
  cleaned = cleaned.replace(/^[a-zA-Z]+:\/\//, '');
  cleaned = cleaned.split('/')[0];
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    return {
      host: parts[0],
      port: parseInt(parts[1], 10) || defaultPort,
    };
  }
  return { host: cleaned, port: defaultPort };
}

function checkTcp(host, port, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    let resolved = false;
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ success: false, responseTime: Date.now() - start, error: `Timeout TCP en ${host}:${port} (> ${timeoutMs}ms)` });
      }
    }, timeoutMs);

    socket.connect(port, host, () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      const responseTime = Date.now() - start;
      socket.end();
      resolve({ success: true, responseTime });
    });

    socket.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: false, responseTime: Date.now() - start, error: err.message || 'TCP rechazada' });
    });
  });
}

function checkSsl(host, port = 443, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    let resolved = false;
    const cleanHost = String(host || '').replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].split(':')[0];

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({ valid: false, daysRemaining: 0, responseTime: Date.now() - start, error: `Timeout SSL en ${cleanHost}:${port}` });
      }
    }, timeoutMs);

    const socket = tls.connect({
      host: cleanHost,
      port,
      servername: cleanHost,
      rejectUnauthorized: false,
    }, () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      const responseTime = Date.now() - start;
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || !cert.valid_to) {
        resolve({ valid: false, daysRemaining: 0, responseTime, error: 'No se obtuvo certificado SSL/TLS' });
        return;
      }

      const expiryDate = new Date(cert.valid_to);
      const now = new Date();
      const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const issuer = typeof cert.issuer === 'object' ? (cert.issuer.O || cert.issuer.CN || 'CA') : String(cert.issuer || '');

      resolve({
        valid: daysRemaining > 0,
        daysRemaining,
        expiryDate,
        issuer,
        responseTime,
      });
    });

    socket.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({ valid: false, daysRemaining: 0, responseTime: Date.now() - start, error: err.message || 'Error SSL/TLS' });
    });
  });
}

async function notifySubscribers(title, body) {
  if (!publicKey || !privateKey) return;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({});
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/' }),
          { urgency: 'high', TTL: 3600 }
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }
  } catch (e) {
    console.error('Error enviando notificaciones push:', e.message);
  }
}

/**
 * Limpieza periódica automática de logs antiguos según política configurada
 */
async function cleanupOldLogs() {
  const now = Date.now();
  // Ejecutar verificación de limpieza cada 6 horas
  if (now - lastCleanup < 6 * 60 * 60 * 1000) {
    return;
  }
  lastCleanup = now;

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'logRetentionDays' },
    });
    const retentionDays = setting ? parseInt(setting.value, 10) : parseInt(process.env.LOG_RETENTION_DAYS || '15', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.checkLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      console.log(`[LIMPIEZA AUTOMATICA] Se depuraron ${result.count} registros de log con más de ${retentionDays} días.`);
    }
  } catch (err) {
    console.error('[LIMPIEZA] Error al depurar logs antiguos:', err.message);
  }
}

async function runHealthChecks() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
  });

  if (services.length === 0) {
    await cleanupOldLogs();
    return;
  }

  for (const service of services) {
    const previousStatus = service.status;
    const timeout = service.timeout || 10000;
    const checkType = service.checkType || 'HTTP';

    let statusCode = null;
    let responseTime = 0;
    let status = 'down';
    let errorMessage = null;
    let details = null;
    let sslDays = service.sslDaysRemaining;
    let sslExpiry = service.sslExpiryDate;
    let sslIssuer = service.sslIssuer;

    if (checkType === 'TCP') {
      const { host, port } = parseHostAndPort(service.url, service.port || 80);
      const targetPort = service.port || port;
      const res = await checkTcp(host, targetPort, timeout);
      responseTime = res.responseTime;
      if (res.success) {
        status = responseTime > 2000 ? 'degraded' : 'up';
        details = `TCP :${targetPort} OK`;
      } else {
        status = 'down';
        errorMessage = res.error;
      }
    } else if (checkType === 'SSL') {
      const { host, port } = parseHostAndPort(service.url, service.port || 443);
      const targetPort = service.port || port;
      const res = await checkSsl(host, targetPort, timeout);
      responseTime = res.responseTime;
      if (!res.valid || res.error) {
        status = 'down';
        errorMessage = res.error || 'Certificado SSL inválido';
      } else if (res.daysRemaining <= 15) {
        status = 'degraded';
        errorMessage = `Certificado SSL expira en ${res.daysRemaining} días`;
        details = `${res.daysRemaining}d restantes`;
      } else {
        status = 'up';
        details = `SSL válido: ${res.daysRemaining}d (${res.issuer})`;
      }
      if (res.expiryDate) {
        sslDays = res.daysRemaining;
        sslExpiry = res.expiryDate;
        sslIssuer = res.issuer;
      }
    } else {
      // HTTP / HTTPS
      const expected = service.expectedStatus || 200;
      const method = service.httpMethod || 'GET';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const start = Date.now();

      const headers = { 'User-Agent': 'MonitorDeServiciosBot/2.0 (+https://monitordeservicios.local)' };
      if (service.headers) {
        try {
          const parsed = JSON.parse(service.headers);
          if (typeof parsed === 'object' && parsed) Object.assign(headers, parsed);
        } catch {}
      }

      try {
        const response = await fetch(service.url, {
          method,
          signal: controller.signal,
          headers,
        });

        responseTime = Date.now() - start;
        statusCode = response.status;

        const isOk = statusCode === expected || (expected === 200 && statusCode >= 200 && statusCode < 400);

        if (isOk) {
          if (service.keyword && service.keyword.trim()) {
            const body = await response.text();
            if (!body.includes(service.keyword.trim())) {
              status = 'down';
              errorMessage = `Palabra clave ausente: "${service.keyword.trim()}"`;
            } else {
              status = responseTime > 2000 ? 'degraded' : 'up';
              details = 'Palabra clave validada';
            }
          } else {
            status = responseTime > 2000 ? 'degraded' : 'up';
          }
        } else {
          status = 'down';
          errorMessage = `HTTP ${statusCode} (esperado: ${expected})`;
        }

        // Inspeccionar SSL si es HTTPS
        if (service.url.toLowerCase().startsWith('https://')) {
          const { host } = parseHostAndPort(service.url, 443);
          checkSsl(host, 443, 4000).then((ssl) => {
            if (ssl.valid && ssl.expiryDate) {
              prisma.service.update({
                where: { id: service.id },
                data: {
                  sslDaysRemaining: ssl.daysRemaining,
                  sslExpiryDate: ssl.expiryDate,
                  sslIssuer: ssl.issuer,
                },
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      } catch (err) {
        responseTime = Date.now() - start;
        status = 'down';
        errorMessage = err.name === 'AbortError' ? `Timeout > ${timeout}ms` : err.message;
      } finally {
        clearTimeout(timer);
      }
    }

    const changed = previousStatus !== 'unknown' && previousStatus !== status;

    // Guardar log en Prisma
    await prisma.checkLog.create({
      data: {
        serviceId: service.id,
        status,
        statusCode,
        responseTime,
        errorMessage,
        checkType,
        details,
      },
    });

    // Actualizar servicio en Prisma
    const total = (service.totalChecks || 0) + 1;
    const success = (service.successfulChecks || 0) + (status === 'up' ? 1 : 0);
    const uptimePercent = Math.round((success / total) * 1000) / 10;

    await prisma.service.update({
      where: { id: service.id },
      data: {
        status,
        statusCode,
        responseTime,
        lastCheck: new Date(),
        lastError: errorMessage,
        totalChecks: total,
        successfulChecks: success,
        uptimePercent,
        ...(sslDays !== null && sslDays !== undefined ? { sslDaysRemaining: sslDays, sslExpiryDate: sslExpiry, sslIssuer } : {}),
        ...(changed || !service.lastStatusChange ? { lastStatusChange: new Date() } : {}),
      },
    });

    const tag = status === 'up' ? '[UP]' : status === 'degraded' ? '[WARN]' : '[DOWN]';
    console.log(`  ${tag} [${checkType}] ${service.name} (${responseTime}ms) - ${service.url}`);

    if (changed) {
      if (status === 'down') {
        console.log(`  [ALERTA] ${service.name} SE HA CAIDO!`);
        await notifySubscribers(`Alerta: ${service.name} CAÍDO [${checkType}]`, `Fallo: ${errorMessage || 'No responde'}`);
      } else if (previousStatus === 'down' && status === 'up') {
        console.log(`  [RECUPERADO] ${service.name} ESTA DE NUEVO EN LINEA`);
        await notifySubscribers(`Recuperado: ${service.name}`, `En línea (${responseTime}ms)`);
      }
    }
  }

  // Comprobar limpieza automática de logs
  await cleanupOldLogs();
}

async function main() {
  console.log('========================================================');
  console.log('DEMONIO DE MONITOREO DE SERVICIOS - HTTP/TCP/SSL & PRISMA');
  console.log('========================================================\n');

  // Ejecución inicial inmediata
  await runHealthChecks();

  // Bucle cada 30 segundos
  setInterval(async () => {
    try {
      await runHealthChecks();
    } catch (e) {
      console.error('Error durante la ronda de chequeos:', e.message);
    }
  }, 30000);
}

main().catch((err) => {
  console.error('Error fatal en el demonio de monitoreo:', err);
  process.exit(1);
});
