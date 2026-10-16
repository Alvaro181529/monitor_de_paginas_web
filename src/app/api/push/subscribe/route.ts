import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Objeto de suscripción inválido' },
        { status: 400 }
      );
    }

    const { endpoint, keys, expirationTime } = subscription;

    const updatedSub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        expirationTime: expirationTime || null,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || '',
      },
      update: {
        expirationTime: expirationTime || null,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || '',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Suscripción registrada con éxito',
      subscriptionId: updatedSub.id,
    });
  } catch (error: unknown) {
    console.error('Error al registrar suscripción push con Prisma:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint es requerido' },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({
      success: true,
      message: 'Suscripción eliminada con éxito',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
