import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Comprobar si es el primer inicio y no existe ningún usuario registrado en Prisma
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) {
      const defaultPasswordHash = await hashPassword('admin123');
      await prisma.user.create({
        data: {
          name: 'Administrador del Sistema',
          email: 'admin@monitor.local',
          password: defaultPasswordHash,
          role: 'admin',
          isActive: true,
        },
      });
      console.log('Usuario administrador inicial creado con Prisma: admin@monitor.local / admin123');
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Esta cuenta ha sido desactivada por el administrador' },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'operador' | 'observador',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error('Error en login con Prisma:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
