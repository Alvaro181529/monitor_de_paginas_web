'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      toast.success(`Bienvenido/a, ${data.user.name}`);
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Error al iniciar sesión';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden flex items-center justify-center p-3 sm:p-6 bg-background">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo Superior */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Monitor de Servicios
          </h1>
          <p className="text-xs text-muted-foreground">
            Acceso seguro y autenticación de operadores
          </p>
        </div>

        {/* Tarjeta de Login */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="pb-3 text-center sm:text-left">
            <CardTitle className="text-base font-semibold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-xs">
              Introduce tus credenciales para acceder al panel de monitoreo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="admin@monitor.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-xs h-9 bg-primary text-primary-foreground shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Accediendo...' : 'Ingresar al Monitor'}</span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </form>

            {/* Aviso de credencial inicial */}
            {/*<div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground text-xs">Acceso Administrador Inicial:</div>
              <p>
                Correo: <code className="text-emerald-500 font-mono">admin@monitor.local</code>
              </p>
              <p>
                Contraseña: <code className="text-emerald-500 font-mono">admin123</code>
              </p>
              <p className="text-[10px] text-muted-foreground italic pt-0.5">
                * Puedes crear operadores y cambiar contraseñas desde el panel.
              </p>
            </div>*/}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
