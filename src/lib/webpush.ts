import webpush from 'web-push';
import prisma from './prisma';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@monitordeservicios.local';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

/**
 * Envía una notificación Web Push a todas las suscripciones activas registradas en la base de datos (Prisma)
 */
export async function sendWebPushNotification(payload: NotificationPayload): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys no configuradas en variables de entorno.');
    return { total: 0, success: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({});

  if (subscriptions.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    tag: payload.tag || 'service-alert',
  });

  const promises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        jsonPayload,
        {
          urgency: 'high',
          TTL: 60 * 60, // 1 hour
        }
      );
      successCount++;
    } catch (err: unknown) {
      failedCount++;
      const errorObj = err as { statusCode?: number; message?: string };
      // Si la suscripción expiró o ya no es válida (410 Gone o 404 Not Found), removerla
      if (errorObj?.statusCode === 410 || errorObj?.statusCode === 404) {
        try {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          console.log(`Suscripción expirada eliminada: ${sub.id}`);
        } catch {
          // ignore error during cleanup
        }
      } else {
        console.error('Error enviando push notification:', errorObj?.message || err);
      }
    }
  });

  await Promise.all(promises);

  return {
    total: subscriptions.length,
    success: successCount,
    failed: failedCount,
  };
}
