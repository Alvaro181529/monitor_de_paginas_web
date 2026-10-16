import { NextResponse } from 'next/server';
import { checkAllServices } from '@/lib/checker';

export async function POST() {
  try {
    const summary = await checkAllServices();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (error: unknown) {
    console.error('Error al verificar todos los servicios:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
