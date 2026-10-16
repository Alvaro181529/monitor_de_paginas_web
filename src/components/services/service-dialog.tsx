'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ServiceItem } from './service-card';
import { toast } from 'sonner';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceToEdit?: ServiceItem | null;
  onSuccess: () => void;
}

export function ServiceDialog({
  open,
  onOpenChange,
  serviceToEdit,
  onSuccess,
}: ServiceDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [checkInterval, setCheckInterval] = useState(60);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeout, setTimeout] = useState(10000);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setUrl(serviceToEdit.url);
      setCheckInterval(serviceToEdit.checkInterval || 60);
      setExpectedStatus(serviceToEdit.expectedStatus || 200);
      setTimeout(serviceToEdit.timeout || 10000);
      setIsActive(serviceToEdit.isActive ?? true);
    } else {
      setName('');
      setUrl('');
      setCheckInterval(60);
      setExpectedStatus(200);
      setTimeout(10000);
      setIsActive(true);
    }
  }, [serviceToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre del servicio es requerido');
      return;
    }

    if (!url.trim()) {
      toast.error('La URL es requerida');
      return;
    }

    setLoading(true);
    try {
      const isEditing = Boolean(serviceToEdit);
      const endpoint = isEditing
        ? `/api/services/${serviceToEdit?._id}`
        : '/api/services';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          checkInterval: Number(checkInterval),
          expectedStatus: Number(expectedStatus),
          timeout: Number(timeout),
          isActive,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al guardar el servicio');
      }

      toast.success(
        isEditing
          ? 'Servicio actualizado correctamente'
          : '¡Servicio agregado y verificado con éxito!'
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-md p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {serviceToEdit ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Introduce la URL del sitio web o API para verificar su conectividad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Nombre descriptivo <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej. Portal Web Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 sm:h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                URL del servicio <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="https://ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 sm:h-9 text-xs"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Si no se especifica protocolo, se usará https:// automáticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Intervalo (segundos)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="3600"
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="h-8 sm:h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Código HTTP Esperado
                </label>
                <Input
                  type="number"
                  min="100"
                  max="599"
                  value={expectedStatus}
                  onChange={(e) => setExpectedStatus(Number(e.target.value))}
                  className="h-8 sm:h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Timeout (ms)
                </label>
                <Input
                  type="number"
                  min="1000"
                  max="60000"
                  step="500"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  className="h-8 sm:h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border">
                <div>
                  <div className="text-xs font-semibold">Monitoreo</div>
                  <div className="text-[10px] text-muted-foreground">Activar chequeos</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-8 text-xs">
              {loading ? 'Guardando...' : serviceToEdit ? 'Actualizar' : 'Guardar y Verificar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
