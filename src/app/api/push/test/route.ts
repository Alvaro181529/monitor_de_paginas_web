import { NextResponse } from 'next/server';
import { sendWebPushNotification } from '@/lib/webpush';

export async function POST(request: Request) {
  try {
    let customTitle = 'Notificación de Prueba';
    let customBody = 'El sistema PWA de Monitor de Servicios está enviando notificaciones correctamente.';

    try {
      const body = await request.json();
      if (body.title) customTitle = body.title;
      if (body.body) customBody = body.body;
    } catch {
      // Usar defaults si no hay body
    }

    const result = await sendWebPushNotification({
      title: customTitle,
      body: customBody,
      url: '/',
      tag: 'test-notification',
    });

    return NextResponse.json({
      success: true,
      message:
        result.total === 0
          ? 'No hay dispositivos suscritos aún a Web Push. Asegúrate de activar las notificaciones en el navegador primero.'
          : `Notificación enviada a ${result.success} de ${result.total} suscriptores.`,
      result,
    });
  } catch (error: unknown) {
    console.error('Error al enviar notificación de prueba:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
