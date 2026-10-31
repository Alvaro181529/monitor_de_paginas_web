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
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  FolderCheck,
  Tag,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CategoryItem {
  _id: string;
  id: string;
  name: string;
  description?: string;
  color: string;
  servicesCount?: number;
  createdAt?: string;
}

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole?: 'admin' | 'operador' | 'observador';
  onCategoriesChanged?: () => void;
}

export const CATEGORY_COLORS: { id: string; label: string; bg: string; text: string; border: string; dot: string }[] = [
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  { id: 'purple', label: 'Púrpura', bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
  { id: 'cyan', label: 'Cian', bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
  { id: 'slate', label: 'Pizarra', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
];

export function getCategoryBadgeStyle(colorName?: string) {
  const match = CATEGORY_COLORS.find((c) => c.id === colorName);
  return match || CATEGORY_COLORS[1]; // default blue
}

export function CategoriesDialog({
  open,
  onOpenChange,
  currentUserRole,
  onCategoriesChanged,
}: CategoriesDialogProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      } else {
        toast.error(data.error || 'Error al obtener categorías');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
      setIsFormOpen(false);
      setEditingCategory(null);
    }
  }, [open, fetchCategories]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor('blue');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setColor(cat.color || 'blue');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = Boolean(editingCategory);
      const url = isEditing
        ? `/api/categories/${editingCategory?._id || editingCategory?.id}`
        : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al guardar la categoría');
      }

      toast.success(
        isEditing
          ? 'Categoría actualizada correctamente'
          : 'Categoría creada con éxito'
      );
      setIsFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
      onCategoriesChanged?.();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (cat.name === 'General') {
      toast.error('La categoría General es fundamental del sistema y no se puede eliminar.');
      return;
    }

    const count = cat.servicesCount || 0;
    const confirmMsg =
      count > 0
        ? `¿Eliminar "${cat.name}"? Los ${count} servicios asociados se moverán a la categoría "General".`
        : `¿Eliminar la categoría "${cat.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/categories/${cat._id || cat.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Categoría eliminada');
        fetchCategories();
        onCategoriesChanged?.();
      } else {
        toast.error(data.error || 'No se pudo eliminar');
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const canEdit = currentUserRole !== 'observador';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-full sm:max-w-2xl max-h-[94vh] p-2.5 sm:p-5 flex flex-col gap-2.5 sm:gap-4 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="pr-8 pb-1.5 border-b border-border/50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <FolderTree className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xs sm:text-base font-bold truncate">
                  Gestión de Categorías
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  Organiza y clasifica tus servicios monitoreados
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCategories}
                disabled={loading}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                title="Recargar categorías"
              >
                <RefreshCw className={`w-3 h-3 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
                <span className="inline sm:hidden">Recargar</span>
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (isFormOpen) {
                      setIsFormOpen(false);
                      setEditingCategory(null);
                    } else {
                      handleOpenCreate();
                    }
                  }}
                  className="h-6 sm:h-7 px-2 sm:px-2.5 text-[10px] sm:text-xs flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                >
                  <Plus className="w-3 h-3 flex-shrink-0" />
                  <span>{isFormOpen ? 'Cerrar' : 'Nueva'}</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* FORMULARIO DE CREACIÓN / EDICIÓN COLLAPSIBLE */}
        {isFormOpen && canEdit && (
          <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-3 rounded-lg border bg-muted/40 space-y-2.5 flex-shrink-0 text-xs"
          >
            <h4 className="font-semibold text-[11px] sm:text-xs flex items-center gap-1 text-foreground">
              <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
              {editingCategory ? `Editar Categoría: ${editingCategory.name}` : 'Crear Nueva Categoría'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Nombre de Categoría *</label>
                <Input
                  placeholder="Ej. Producción, APIs, Clínicas..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-7 text-xs"
                  required
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] sm:text-[11px] font-medium">Descripción (opcional)</label>
                <Input
                  placeholder="Breve propósito o ámbito"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Selector de Color de Etiqueta */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] sm:text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" /> Color de Identificación
                </label>
                {/* Previsualización en vivo */}
                <span className="text-[10px] flex items-center gap-1">
                  Vista previa:
                  <Badge className={`${getCategoryBadgeStyle(color).bg} ${getCategoryBadgeStyle(color).text} ${getCategoryBadgeStyle(color).border} text-[9px] px-1.5 py-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getCategoryBadgeStyle(color).dot} mr-1 inline-block`} />
                    {name.trim() || 'Ejemplo'}
                  </Badge>
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {CATEGORY_COLORS.map((c) => {
                  const isSelected = color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`h-6 px-2 rounded-md border text-[10px] flex items-center gap-1 transition-all ${
                        isSelected
                          ? `${c.bg} ${c.text} ${c.border} font-semibold ring-1 ring-primary`
                          : 'bg-background hover:bg-muted text-muted-foreground border-input'
                      }`}
                      title={c.label}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span>{c.label}</span>
                      {isSelected && <Check className="w-2.5 h-2.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingCategory(null);
                }}
                className="h-6 text-[10px] sm:text-xs"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="h-6 text-[10px] sm:text-xs">
                {submitting ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </Button>
            </div>
          </form>
        )}

        {/* TABLA DE CATEGORÍAS */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border border-border/60 rounded-lg min-w-0 bg-background max-h-[60vh] sm:max-h-[65vh]">
          <Table className="w-full text-[10px] sm:text-xs min-w-[290px]">
            <TableHeader className="bg-muted/70 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead className="py-1.5 px-2 text-[10px] sm:text-xs">Categoría</TableHead>
                <TableHead className="py-1.5 px-1.5 text-[10px] sm:text-xs hidden sm:table-cell">Descripción</TableHead>
                <TableHead className="py-1.5 px-1.5 text-[10px] sm:text-xs text-center">Servicios</TableHead>
                <TableHead className="py-1.5 px-2 text-[10px] sm:text-xs text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                    Cargando categorías...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                    No se encontraron categorías.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const style = getCategoryBadgeStyle(cat.color);
                  return (
                    <TableRow key={cat._id || cat.id} className="text-[10px] sm:text-xs hover:bg-muted/30">
                      <TableCell className="py-1.5 px-2 max-w-[140px] sm:max-w-none">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`${style.bg} ${style.text} ${style.border} text-[9px] sm:text-[10px] px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {cat.name}
                          </Badge>
                        </div>
                        {cat.description && (
                          <div className="text-[9px] text-muted-foreground truncate sm:hidden mt-0.5">
                            {cat.description}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-1.5 px-1.5 text-muted-foreground hidden sm:table-cell text-[10px] truncate max-w-xs">
                        {cat.description || '—'}
                      </TableCell>

                      <TableCell className="py-1.5 px-1.5 text-center">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 font-mono">
                          {cat.servicesCount || 0}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-1.5 px-2 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(cat)}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Editar categoría"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            {cat.name !== 'General' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(cat)}
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
