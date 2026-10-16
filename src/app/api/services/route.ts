import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkService } from '@/lib/checker';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    const total = services.length;
    const upCount = services.filter((s) => s.status === 'up').length;
    const downCount = services.filter((s) => s.status === 'down').length;
    const degradedCount = services.filter((s) => s.status === 'degraded').length;
    const activeServices = services.filter((s) => s.isActive);

    const latencies = services
      .filter((s) => s.responseTime && s.status !== 'down')
      .map((s) => s.responseTime as number);

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    const enrichedServices = services.map((s) => ({
      _id: s.id,
      name: s.name,
      url: s.url,
      status: s.status,
      statusCode: s.statusCode,
      responseTime: s.responseTime,
      checkInterval: s.checkInterval,
      expectedStatus: s.expectedStatus,
      timeout: s.timeout,
      lastCheck: s.lastCheck ? s.lastCheck.toISOString() : null,
      lastStatusChange: s.lastStatusChange ? s.lastStatusChange.toISOString() : null,
      lastError: s.lastError,
      uptimePercent: s.uptimePercent,
      totalChecks: s.totalChecks,
      successfulChecks: s.successfulChecks,
      isActive: s.isActive,
      tags: s.tags ? s.tags.split(',') : [],
      recentLogs: s.logs.reverse().map((l) => ({
        _id: l.id,
        status: l.status,
        responseTime: l.responseTime,
        createdAt: l.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total,
        up: upCount,
        down: downCount,
        degraded: degradedCount,
        active: activeServices.length,
        avgLatency,
        uptimeAvg:
          total > 0
            ? Math.round(
                services.reduce((acc, curr) => acc + (curr.uptimePercent || 100), 0) / total
              )
            : 100,
      },
      services: enrichedServices,
    });
  } catch (error: unknown) {
    console.error('Error al obtener servicios con Prisma:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, checkInterval, expectedStatus, timeout, tags } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Nombre y URL son requeridos' },
        { status: 400 }
      );
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newService = await prisma.service.create({
      data: {
        name: name.trim(),
        url: formattedUrl,
        checkInterval: Number(checkInterval) || 60,
        expectedStatus: Number(expectedStatus) || 200,
        timeout: Number(timeout) || 10000,
        tags: Array.isArray(tags) ? tags.join(',') : '',
        status: 'unknown',
        isActive: true,
      },
    });

    // Realizar primer chequeo inmediato
    try {
      await checkService(newService);
    } catch (checkErr) {
      console.warn('Chequeo inicial con advertencia:', checkErr);
    }

    const updated = await prisma.service.findUnique({
      where: { id: newService.id },
    });

    return NextResponse.json({
      success: true,
      service: {
        ...updated,
        _id: updated?.id,
      },
    });
  } catch (error: unknown) {
    console.error('Error al crear servicio con Prisma:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
