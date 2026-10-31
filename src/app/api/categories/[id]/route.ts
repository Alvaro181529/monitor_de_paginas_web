import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    if (session.role === 'observador') {
      return NextResponse.json(
        { success: false, error: 'Los observadores no tienen permisos para editar categorías.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, color } = body;

    const currentCat = await prisma.category.findUnique({
      where: { id },
    });

    if (!currentCat) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    const updateData: { name?: string; description?: string | null; color?: string } = {};

    if (name && name.trim() && name.trim() !== currentCat.name) {
      const normalizedName = name.trim();
      const existing = await prisma.category.findUnique({
        where: { name: normalizedName },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una categoría con ese nombre' },
          { status: 409 }
        );
      }
      updateData.name = normalizedName;

      // Actualizar servicios que tenían el nombre antiguo
      await prisma.service.updateMany({
        where: { category: currentCat.name },
        data: { category: normalizedName },
      });
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (color) {
      updateData.color = color;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      category: {
        _id: updated.id,
        id: updated.id,
        name: updated.name,
        description: updated.description,
        color: updated.color,
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    if (session.role === 'observador') {
      return NextResponse.json(
        { success: false, error: 'Los observadores no tienen permisos para eliminar categorías.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Reasignar los servicios que usaban esta categoría a 'General'
    if (category.name !== 'General') {
      await prisma.service.updateMany({
        where: { category: category.name },
        data: { category: 'General' },
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada y servicios reasignados a General',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
