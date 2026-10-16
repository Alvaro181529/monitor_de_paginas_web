'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar Service Worker y verificar soporte de forma defensiva
  useEffect(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      ) {
        setIsSupported(true);
        setPermission(window.Notification.permission);

        navigator.serviceWorker
          .register('/sw.js')
          .then(async (registration) => {
            setSwRegistration(registration);
            try {
              const existingSub = await registration.pushManager.getSubscription();
              setIsSubscribed(!!existingSub);
            } catch {
              // Ignore push manager subscription read error on restricted origins
            }
          })
          .catch((err) => {
            console.warn('Service Worker registration note:', err?.message || err);
          });
      }
    } catch (err) {
      console.warn('Notification/SW environment check:', err);
    }
  }, []);

  // Suscribirse a Notificaciones Push
  const subscribeToPush = useCallback(async () => {
    if (
      !isSupported ||
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      toast.error('Las notificaciones Push requieren HTTPS o localhost en este navegador');
      return false;
    }

    setLoading(true);
    try {
      // 1. Pedir permiso al usuario si aún no está otorgado
      const perm = await window.Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.warning('Permiso de notificaciones denegado o cerrado');
        setLoading(false);
        return false;
      }

      // 2. Obtener clave pública VAPID
      const vapidRes = await fetch('/api/push/vapid-key');
      const vapidData = await vapidRes.json();
      if (!vapidData.success || !vapidData.publicKey) {
        throw new Error(vapidData.error || 'No se pudo obtener la clave VAPID');
      }

      // 3. Asegurar Service Worker activo
      const registration = swRegistration || (await navigator.serviceWorker.ready);
      const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

      // 4. Suscribirse a PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });

      // 5. Enviar suscripción a MongoDB
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.success) {
        throw new Error(saveData.error || 'Error guardando suscripción');
      }

      setIsSubscribed(true);
      toast.success('Notificaciones Push activadas con éxito');
      return true;
    } catch (err: unknown) {
      console.error('Error al suscribir a notificaciones:', err);
      toast.error(`Error al activar notificaciones: ${(err as Error).message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, swRegistration]);

  // Cancelar suscripción
  const unsubscribeFromPush = useCallback(async () => {
    if (!swRegistration) return;

    setLoading(true);
    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.info('Notificaciones desactivadas');
    } catch (err: unknown) {
      console.error('Error al cancelar suscripción:', err);
      toast.error('Error al desactivar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [swRegistration]);

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(async () => {
    try {
      toast.loading('Enviando notificación de prueba...', { id: 'test-push' });
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Notificación de Prueba - Monitor Web',
          body: 'Tu dispositivo está correctamente configurado para recibir alertas del sistema de monitoreo.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message, { id: 'test-push' });
      } else {
        toast.error(data.error || 'Error al enviar notificación de prueba', { id: 'test-push' });
      }
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`, { id: 'test-push' });
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  };
}
