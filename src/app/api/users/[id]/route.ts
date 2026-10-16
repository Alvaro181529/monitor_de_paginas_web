import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || payload.role !== 'admin') return null;

  return payload;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, role, isActive } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (name) dataToUpdate.name = name.trim();
    if (email) dataToUpdate.email = email.toLowerCase().trim();
    if (role) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (password && password.trim().length > 0) {
      dataToUpdate.password = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      user: {
        _id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Evitar que el administrador se borre a sí mismo
    if (admin.userId === id) {
      return NextResponse.json(
        { success: false, error: 'No puedes eliminar tu propia cuenta en uso' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
