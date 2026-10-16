import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!service) {
      return NextResponse.json({ success: false, error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      service: {
        ...service,
        _id: service.id,
      },
      logs: service.logs.map((l) => ({
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
