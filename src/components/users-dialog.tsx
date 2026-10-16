'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  RefreshCw,
  UserCheck,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'observador';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: 'admin' | 'operador' | 'observador';
}

export function UsersDialog({
  open,
  onOpenChange,
  currentUserRole,
}: UsersDialogProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario nuevo usuario
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operador' | 'observador'>('operador');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || 'Error al obtener usuarios');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && currentUserRole === 'admin') {
      fetchUsers();
    }
  }, [open, currentUserRole, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al crear usuario');
      }

      toast.success('Usuario creado exitosamente');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setIsCreating(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Usuario ${user.isActive ? 'desactivado' : 'activado'}`);
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Usuario eliminado');
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-full sm:max-w-2xl max-h-[94vh] p-2.5 sm:p-5 flex flex-col gap-2.5 sm:gap-4 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="pr-8 pb-1.5 border-b border-border/50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xs sm:text-base font-bold truncate">
                  Gestión de Usuarios
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Cuentas con acceso al panel
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                title="Recargar usuarios"
              >
                <RefreshCw className={`w-3 h-3 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
                <span className="inline sm:hidden">Recargar</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreating(!isCreating)}
                className="h-6 sm:h-7 px-2 sm:px-2.5 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
              >
                <UserPlus className="w-3 h-3 flex-shrink-0" />
                <span>{isCreating ? 'Cerrar Form' : 'Nuevo'}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* FORMULARIO DE NUEVO USUARIO (COLLAPSIBLE) */}
        {isCreating && (
          <form
            onSubmit={handleCreateUser}
            className="p-2 sm:p-3 rounded-lg border bg-muted/40 space-y-2 flex-shrink-0 text-xs"
          >
            <h4 className="font-semibold text-[11px] sm:text-xs flex items-center gap-1 text-foreground">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              Registrar Nuevo Acceso
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Nombre</label>
                <Input
                  placeholder="Ej. Ing. Carlos Soto"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-7 text-xs"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Correo Electrónico</label>
                <Input
                  type="email"
                  placeholder="operador@monitor.local"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-7 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-7 text-xs"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Rol</label>
                <select
                  aria-label="Rol del nuevo usuario"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                  className="w-full h-7 px-2 rounded-md border border-input bg-background text-[11px] focus:outline-none"
                >
                  <option value="operador">Operador (Monitorear y editar)</option>
                  <option value="admin">Administrador (Total)</option>
                  <option value="observador">Observador (Solo lectura)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="h-6 text-[10px] sm:text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-6 text-[10px] sm:text-xs">
                {submitting ? 'Guardando...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        )}

        {/* TABLA DE USUARIOS CON SCROLL RESPONSIVO */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border border-border/60 rounded-lg min-w-0 bg-background max-h-[60vh] sm:max-h-[65vh]">
          <Table className="w-full text-[10px] sm:text-xs min-w-[300px]">
            <TableHeader className="bg-muted/70 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead className="py-1.5 px-2 text-[10px] sm:text-xs">Usuario</TableHead>
                <TableHead className="py-1.5 px-1.5 text-[10px] sm:text-xs">Rol</TableHead>
                <TableHead className="py-1.5 px-1.5 text-[10px] sm:text-xs">Estado</TableHead>
                <TableHead className="py-1.5 px-1.5 text-[10px] sm:text-xs hidden sm:table-cell">Último Acceso</TableHead>
                <TableHead className="py-1.5 px-2 text-[10px] sm:text-xs text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    Cargando lista de usuarios...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    No se encontraron usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id} className="text-[10px] sm:text-xs hover:bg-muted/30">
                    <TableCell className="py-1.5 px-2 max-w-[120px] sm:max-w-none">
                      <div className="font-medium text-foreground truncate">{u.name}</div>
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground font-mono truncate">
                        {u.email}
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5 px-1.5 whitespace-nowrap">
                      {u.role === 'admin' ? (
                        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[9px] sm:text-[10px] px-1 py-0">
                          <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 capitalize">
                          {u.role}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-1.5 px-1.5">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => handleToggleStatus(u)}
                          aria-label="Estado del usuario"
                        />
                        <span className="text-[9px] text-muted-foreground hidden xs:inline">
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5 px-1.5 text-muted-foreground hidden sm:table-cell text-[10px] whitespace-nowrap">
                      {u.lastLogin ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(u.lastLogin).toLocaleDateString()}
                        </span>
                      ) : (
                        'Nunca'
                      )}
                    </TableCell>

                    <TableCell className="py-1.5 px-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(u)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
