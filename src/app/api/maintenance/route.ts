import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/maintenance
 * Obtiene métricas del estado de la base de datos, total de logs, políticas de retención
 * y registros candidatos a depuración.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener configuración de retención de logs
    const retentionSetting = await prisma.setting.findUnique({
      where: { key: 'logRetentionDays' },
    });
    const retentionDays = retentionSetting ? parseInt(retentionSetting.value, 10) : 15;

    // Métricas de logs
    const totalLogs = await prisma.checkLog.count();

    const oldestLog = await prisma.checkLog.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const newestLog = await prisma.checkLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Calcular registros expirados según la política de retención
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredLogsCount = await prisma.checkLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // Desglose rápido por estado
    const [upLogs, downLogs, degradedLogs] = await Promise.all([
      prisma.checkLog.count({ where: { status: 'up' } }),
      prisma.checkLog.count({ where: { status: 'down' } }),
      prisma.checkLog.count({ where: { status: 'degraded' } }),
    ]);

    const totalServices = await prisma.service.count();
    const totalCategories = await prisma.category.count();

    // Estimación aproximada de tamaño en disco (~200 bytes por log en MongoDB)
    const estimatedSizeBytes = totalLogs * 200;
    const estimatedSizeMb = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);

    return NextResponse.json({
      success: true,
      stats: {
        totalLogs,
        oldestLogDate: oldestLog?.createdAt || null,
        newestLogDate: newestLog?.createdAt || null,
        retentionDays,
        expiredLogsCount,
        estimatedSizeMb,
        breakdown: {
          up: upLogs,
          down: downLogs,
          degraded: degradedLogs,
        },
        totalServices,
        totalCategories,
      },
    });
  } catch (error: unknown) {
    console.error('Error en GET /api/maintenance:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/maintenance
 * Ejecuta purga y depuración de logs manual o programada
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden ejecutar labores de mantenimiento' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, days, serviceId } = body;

    let deletedCount = 0;

    if (action === 'purge_old') {
      const retentionDays = Number(days) > 0 ? Number(days) : 15;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const result = await prisma.checkLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoff,
          },
        },
      });
      deletedCount = result.count;
    } else if (action === 'purge_service' && serviceId) {
      const result = await prisma.checkLog.deleteMany({
        where: { serviceId },
      });
      deletedCount = result.count;
    } else if (action === 'purge_all') {
      const result = await prisma.checkLog.deleteMany({});
      deletedCount = result.count;
    } else {
      return NextResponse.json(
        { success: false, error: 'Acción de mantenimiento no válida' },
        { status: 400 }
      );
    }

    const remainingLogs = await prisma.checkLog.count();

    return NextResponse.json({
      success: true,
      deletedCount,
      remainingLogs,
      message: `Se han depurado ${deletedCount} registros de log con éxito.`,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/maintenance:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/maintenance
 * Actualiza la política de retención de logs en días
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden cambiar la política de retención' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const days = parseInt(body.retentionDays, 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: 'El período de retención debe ser entre 1 y 365 días' },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key: 'logRetentionDays' },
      update: { value: days.toString() },
      create: { key: 'logRetentionDays', value: days.toString() },
    });

    return NextResponse.json({
      success: true,
      retentionDays: days,
      message: `Política de retención actualizada a ${days} días.`,
    });
  } catch (error: unknown) {
    console.error('Error en PUT /api/maintenance:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
