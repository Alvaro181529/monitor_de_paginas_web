import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 10), 500);
    const status = searchParams.get('status'); // all | up | down | degraded
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD o ISO
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD o ISO

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Construir filtro para Prisma
    const whereClause: {
      serviceId: string;
      status?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      serviceId: id,
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          whereClause.createdAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // Si es solo fecha YYYY-MM-DD, llevar hasta final del día 23:59:59.999
          if (endDate.length === 10) {
            end.setHours(23, 59, 59, 999);
          }
          whereClause.createdAt.lte = end;
        }
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.checkLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.checkLog.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      success: true,
      service: {
        ...service,
        _id: service.id,
      },
      totalLogs: totalCount,
      logs: logs.map((l) => ({
        _id: l.id,
        status: l.status,
        statusCode: l.statusCode,
        responseTime: l.responseTime,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, checkInterval, expectedStatus, timeout, isActive, tags } = body;

    let formattedUrl = url?.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(formattedUrl && { url: formattedUrl }),
        ...(checkInterval !== undefined && { checkInterval: Number(checkInterval) }),
        ...(expectedStatus !== undefined && { expectedStatus: Number(expectedStatus) }),
        ...(timeout !== undefined && { timeout: Number(timeout) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.join(',') : String(tags) }),
      },
    });

    return NextResponse.json({
      success: true,
      service: {
        ...updated,
        _id: updated.id,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prisma elimina en cascada los logs gracias a onDelete: Cascade
    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Servicio eliminado correctamente' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
