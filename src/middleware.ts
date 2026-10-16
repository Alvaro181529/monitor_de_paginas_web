import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

// Rutas públicas que no requieren autenticación previa
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/manifest.json',
  '/sw.js',
  '/favicon.png',
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir recursos estáticos, imágenes, fuentes e iconos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons/') ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  // Permitir acceso al endpoint check-all si proviene del demonio local o cron
  if (pathname === '/api/services/check-all' && request.method === 'POST') {
    return NextResponse.next();
  }

  // Obtener cookie de sesión
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Si es una petición a la API, responder 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }
    // Si es una página web, redirigir al login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validar token criptográfico
  const payload = await verifySessionToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Sesión expirada o inválida' },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
