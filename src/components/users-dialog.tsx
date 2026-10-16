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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  UserPlus,
  Trash2,
  Key,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export interface UserItem {
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
  currentUserRole?: string;
}

export function UsersDialog({ open, onOpenChange, currentUserRole }: UsersDialogProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
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
        toast.error(data.error || 'No se pudieron cargar los usuarios');
      }
    } catch (err: unknown) {
      toast.error('Error al consultar usuarios: ' + (err as Error).message);
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
      <DialogContent className="w-[96vw] max-w-full sm:max-w-2xl max-h-[92vh] p-3 sm:p-6 flex flex-col gap-4 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50 gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold truncate">
                Gestión de Usuarios y Seguridad
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Administradores y operadores autorizados del monitor
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 mr-6">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="h-8 px-2 text-xs"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
              className="h-8 px-2.5 text-xs flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </Button>
          </div>
        </DialogHeader>

        {/* FORMULARIO DE NUEVO USUARIO (COLLAPSIBLE) */}
        {isCreating && (
          <form
            onSubmit={handleCreateUser}
            className="p-3 sm:p-4 rounded-xl border bg-muted/40 space-y-3 flex-shrink-0 text-xs"
          >
            <h4 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Registrar Nuevo Acceso
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium">Nombre Completo</label>
                <Input
                  placeholder="Ej. Ing. Carlos Soto"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium">Correo Electrónico</label>
                <Input
                  type="email"
                  placeholder="operador@monitor.local"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium">Contraseña Inicial</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium">Rol de Permisos</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                  className="w-full h-8 px-2.5 rounded-md border bg-background text-xs focus:outline-none"
                >
                  <option value="operador">Operador (Monitorear y editar sitios)</option>
                  <option value="admin">Administrador (Control total + usuarios)</option>
                  <option value="observador">Observador (Solo lectura)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-7 text-xs">
                {submitting ? 'Guardando...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        )}

        {/* TABLA DE USUARIOS */}
        <div className="flex-1 overflow-auto border rounded-xl min-w-0">
          <Table className="w-full text-xs">
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs py-2 px-3">Usuario</TableHead>
                <TableHead className="text-xs py-2 px-3">Rol</TableHead>
                <TableHead className="text-xs py-2 px-3">Estado</TableHead>
                <TableHead className="text-xs py-2 px-3 hidden sm:table-cell">Último Acceso</TableHead>
                <TableHead className="text-xs py-2 px-3 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando lista de usuarios...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id} className="text-xs">
                    <TableCell className="py-2 px-3">
                      <div className="font-medium text-foreground truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {u.email}
                      </div>
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      {u.role === 'admin' ? (
                        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
                          <ShieldCheck className="w-3 h-3 mr-0.5" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {u.role}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => handleToggleStatus(u)}
                          aria-label="Estado del usuario"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 px-3 text-muted-foreground hidden sm:table-cell text-[11px]">
                      {u.lastLogin ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(u.lastLogin).toLocaleDateString()}
                        </span>
                      ) : (
                        'Nunca'
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(u)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
