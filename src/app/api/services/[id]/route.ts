import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const hours = parseInt(searchParams.get('hours') || '0', 10);
    const startDate = searchParams.get('startDate');
    const startTime = searchParams.get('startTime');
    const endDate = searchParams.get('endDate');
    const endTime = searchParams.get('endTime');

    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const whereClause: Record<string, unknown> = {
      serviceId: id,
    };

    if (status && ['up', 'down', 'degraded'].includes(status)) {
      whereClause.status = status;
    }

    if (hours > 0) {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);
      whereClause.createdAt = {
        gte: hoursAgo,
      };
    } else if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};

      if (startDate) {
        let startIso = startDate;
        if (startTime) {
          startIso = `${startDate}T${startTime}:00`;
        } else {
          startIso = `${startDate}T00:00:00`;
        }
        const sDate = new Date(startIso);
        if (!isNaN(sDate.getTime())) {
          dateFilter.gte = sDate;
        }
      }

      if (endDate) {
        let endIso = endDate;
        if (endTime) {
          endIso = `${endDate}T${endTime}:59`;
        } else {
          endIso = `${endDate}T23:59:59`;
        }
        const eDate = new Date(endIso);
        if (!isNaN(eDate.getTime())) {
          dateFilter.lte = eDate;
        }
      }

      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }
    }

    const [logs, totalLogs] = await Promise.all([
      prisma.checkLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.checkLog.count({
        where: whereClause,
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      _id: log.id,
      serviceId: log.serviceId,
      status: log.status,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      errorMessage: log.errorMessage,
      checkType: log.checkType,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      service: {
        ...service,
        _id: service.id,
        category: service.category || 'General',
      },
      logs: formattedLogs,
      totalLogs,
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
    const {
      name,
      url,
      category,
      checkInterval,
      expectedStatus,
      timeout,
      isActive,
      tags,
      checkType,
      port,
      httpMethod,
      headers,
      keyword,
    } = body;

    let formattedUrl = url?.trim();
    const type = checkType || undefined;
    if (formattedUrl && (!type || type === 'HTTP') && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(formattedUrl && { url: formattedUrl }),
        ...(category !== undefined && { category: category ? category.trim() : 'General' }),
        ...(checkInterval !== undefined && { checkInterval: Number(checkInterval) }),
        ...(expectedStatus !== undefined && { expectedStatus: Number(expectedStatus) }),
        ...(timeout !== undefined && { timeout: Number(timeout) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.join(',') : String(tags) }),
        ...(checkType !== undefined && { checkType }),
        ...(port !== undefined && { port: port ? Number(port) : null }),
        ...(httpMethod !== undefined && { httpMethod }),
        ...(headers !== undefined && { headers: headers ? (typeof headers === 'string' ? headers : JSON.stringify(headers)) : null }),
        ...(keyword !== undefined && { keyword: keyword ? String(keyword).trim() : null }),
      },
    });

    return NextResponse.json({
      success: true,
      service: {
        ...updated,
        _id: updated.id,
        category: updated.category || 'General',
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
