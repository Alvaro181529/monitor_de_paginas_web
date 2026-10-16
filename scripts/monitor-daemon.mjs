#!/usr/bin/env node

/**
 * Daemon de Monitoreo Continuo en Segundo Plano con Prisma
 * Base de datos completamente independiente (SQLite / PostgreSQL / MySQL)
 *
 * Uso:
 *   node scripts/monitor-daemon.mjs
 *   npm run monitor
 */

import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import dotenv from 'dotenv';
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

async function notifySubscribers(title, body) {
  if (!publicKey || !privateKey) return;
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
}

async function runHealthChecks() {
  const timestamp = new Date().toLocaleTimeString();
  const services = await prisma.service.findMany({ where: { isActive: true } });

  if (services.length === 0) {
    console.log(`[${timestamp}] No hay servicios activos para monitorear.`);
    return;
  }

  console.log(`[${timestamp}] [CHECK] Verificando ${services.length} servicios con Prisma...`);

  for (const service of services) {
    const previousStatus = service.status;
    const timeout = service.timeout || 10000;
    const expected = service.expectedStatus || 200;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();

    let status = 'down';
    let statusCode = null;
    let responseTime = 0;
    let errorMessage = null;

    try {
      const res = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'MonitorDeServicios-Daemon/1.0' },
      });
      responseTime = Date.now() - start;
      statusCode = res.status;

      if (statusCode === expected || (expected === 200 && statusCode >= 200 && statusCode < 400)) {
        status = responseTime > 2000 ? 'degraded' : 'up';
      } else {
        status = 'down';
        errorMessage = `HTTP ${statusCode} (esperado ${expected})`;
      }
    } catch (err) {
      responseTime = Date.now() - start;
      status = 'down';
      errorMessage = err.name === 'AbortError' ? `Timeout > ${timeout}ms` : err.message;
    } finally {
      clearTimeout(timer);
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
        ...(changed || !service.lastStatusChange ? { lastStatusChange: new Date() } : {}),
      },
    });

    const tag = status === 'up' ? '[UP]' : status === 'degraded' ? '[WARN]' : '[DOWN]';
    console.log(`  ${tag} ${service.name} (${responseTime}ms) - ${service.url}`);

    if (changed) {
      if (status === 'down') {
        console.log(`  [ALERTA] ${service.name} SE HA CAIDO!`);
        await notifySubscribers(`Alerta: ${service.name} CAIDO`, `No responde: ${errorMessage}`);
      } else if (previousStatus === 'down' && status === 'up') {
        console.log(`  [RECUPERADO] ${service.name} ESTA DE NUEVO EN LINEA`);
        await notifySubscribers(`Recuperado: ${service.name}`, `En linea (${responseTime}ms)`);
      }
    }
  }
}

async function main() {
  console.log('========================================================');
  console.log('DEMONIO DE MONITOREO DE SERVICIOS WEB - PRISMA ORM');
  console.log(`Base de datos: ${process.env.DATABASE_URL || 'file:./monitor.db'}`);
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
