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

const DEFAULT_CATEGORIES = [
  { name: 'General', color: 'blue', description: 'Servicios web generales' },
  { name: 'Producción', color: 'emerald', description: 'Sistemas críticos en producción' },
  { name: 'APIs & Backend', color: 'purple', description: 'Microservicios y endpoints REST/GraphQL' },
  { name: 'Servicios Médicos', color: 'cyan', description: 'Sistemas clínicos, PACS, RIS y visores' },
];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    // Comprobar si existen categorías, si no, inicializar por defecto
    const count = await prisma.category.count();
    if (count === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.category.create({
          data: cat,
        });
      }
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    // Calcular cuántos servicios tiene cada categoría
    const services = await prisma.service.findMany({
      select: { category: true },
    });

    const countsMap: Record<string, number> = {};
    for (const s of services) {
      const catName = s.category || 'General';
      countsMap[catName] = (countsMap[catName] || 0) + 1;
    }

    const enrichedCategories = categories.map((c) => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color || 'blue',
      servicesCount: countsMap[c.name] || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      categories: enrichedCategories,
    });
  } catch (error: unknown) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { success: false, error: 'Los usuarios observadores no tienen permisos para crear categorías.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la categoría es requerido' },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();

    // Comprobar si ya existe
    const existing = await prisma.category.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una categoría con este nombre' },
        { status: 409 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name: normalizedName,
        description: description ? description.trim() : null,
        color: color || 'blue',
      },
    });

    return NextResponse.json({
      success: true,
      category: {
        _id: newCategory.id,
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color,
        servicesCount: 0,
        createdAt: newCategory.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
