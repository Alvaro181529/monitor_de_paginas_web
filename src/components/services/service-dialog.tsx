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
import { Tag, Globe, Server, Lock, Code2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceToEdit?: ServiceItem | null;
  onSuccess: () => void;
  availableCategories?: { id: string; name: string }[];
}

export function ServiceDialog({
  open,
  onOpenChange,
  serviceToEdit,
  onSuccess,
  availableCategories,
}: ServiceDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [checkType, setCheckType] = useState<'HTTP' | 'TCP' | 'SSL'>('HTTP');
  const [port, setPort] = useState<number | string>('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [keyword, setKeyword] = useState('');
  const [headers, setHeaders] = useState('');
  const [checkInterval, setCheckInterval] = useState(60);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeout, setTimeout] = useState(10000);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cargar categorías si no se pasan por props
  useEffect(() => {
    if (open) {
      if (availableCategories && availableCategories.length > 0) {
        setCategories(availableCategories);
      } else {
        fetch('/api/categories')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.categories) {
              setCategories(data.categories);
            }
          })
          .catch(() => {});
      }
    }
  }, [open, availableCategories]);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setUrl(serviceToEdit.url);
      setCategory(serviceToEdit.category || 'General');
      setCheckType(serviceToEdit.checkType || 'HTTP');
      setPort(serviceToEdit.port || (serviceToEdit.checkType === 'TCP' ? 80 : serviceToEdit.checkType === 'SSL' ? 443 : ''));
      setHttpMethod((serviceToEdit.httpMethod as 'GET' | 'POST' | 'HEAD') || 'GET');
      setKeyword(serviceToEdit.keyword || '');
      setHeaders(serviceToEdit.headers || '');
      setCheckInterval(serviceToEdit.checkInterval || 60);
      setExpectedStatus(serviceToEdit.expectedStatus || 200);
      setTimeout(serviceToEdit.timeout || 10000);
      setIsActive(serviceToEdit.isActive ?? true);
      setShowAdvanced(Boolean(serviceToEdit.keyword || serviceToEdit.headers || serviceToEdit.httpMethod !== 'GET'));
    } else {
      setName('');
      setUrl('');
      setCategory('General');
      setCheckType('HTTP');
      setPort('');
      setHttpMethod('GET');
      setKeyword('');
      setHeaders('');
      setCheckInterval(60);
      setExpectedStatus(200);
      setTimeout(10000);
      setIsActive(true);
      setShowAdvanced(false);
    }
  }, [serviceToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre del servicio es obligatorio');
      return;
    }

    if (!url.trim()) {
      toast.error('La dirección URL o Host es obligatoria');
      return;
    }

    if (checkType === 'TCP' && !port) {
      toast.error('Debes especificar el número de puerto para el chequeo TCP');
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
          category: category || 'General',
          checkType,
          port: port ? Number(port) : null,
          httpMethod,
          keyword: keyword.trim() || null,
          headers: headers.trim() || null,
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
      <DialogContent className="w-[calc(100%-0.75rem)] sm:w-[94vw] max-w-lg p-3 sm:p-5 max-h-[94vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <DialogHeader className="pr-7">
            <DialogTitle className="text-sm sm:text-base font-bold">
              {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs">
              Configura monitoreo para páginas Web, APIs, puertos TCP o certificados SSL.
            </DialogDescription>
          </DialogHeader>

          {/* Selector de Tipo de Chequeo */}
          <div className="space-y-1">
            <label className="text-[11px] sm:text-xs font-semibold text-foreground">
              Tipo de Chequeo
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-lg border">
              <button
                type="button"
                onClick={() => {
                  setCheckType('HTTP');
                  if (!port) setPort('');
                }}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                  checkType === 'HTTP'
                    ? 'bg-background shadow-xs text-foreground font-semibold border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span>Web HTTP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCheckType('TCP');
                  if (!port) setPort(5432);
                }}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                  checkType === 'TCP'
                    ? 'bg-background shadow-xs text-foreground font-semibold border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-blue-500" />
                <span>Puerto TCP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCheckType('SSL');
                  if (!port) setPort(443);
                }}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                  checkType === 'SSL'
                    ? 'bg-background shadow-xs text-foreground font-semibold border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Certificado SSL</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 py-0.5">
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-semibold text-foreground">
                Nombre descriptivo <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={
                  checkType === 'TCP'
                    ? 'Ej. Base de Datos PostgreSQL / PACS'
                    : checkType === 'SSL'
                    ? 'Ej. Certificado SSL Portal Clínico'
                    : 'Ej. Portal Web Principal'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 sm:h-8 text-xs"
                required
              />
            </div>

            {/* Dirección / URL / Host */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`${checkType === 'HTTP' ? 'col-span-3' : 'col-span-2'} space-y-1`}>
                <label className="text-[11px] sm:text-xs font-semibold text-foreground">
                  {checkType === 'HTTP' ? 'URL del servicio' : 'Host / IP o Dominio'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder={
                    checkType === 'TCP'
                      ? '192.168.1.50 o db.hospital.local'
                      : checkType === 'SSL'
                      ? 'portal.hospital.com'
                      : 'https://ejemplo.com'
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-7 sm:h-8 text-xs"
                  required
                />
              </div>

              {checkType !== 'HTTP' && (
                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs font-semibold text-foreground">
                    Puerto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder={checkType === 'SSL' ? '443' : '5432'}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="h-7 sm:h-8 text-xs font-mono"
                    required
                  />
                </div>
              )}
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-semibold text-foreground flex items-center gap-1">
                <Tag className="w-3 h-3 text-primary" /> Categoría
              </label>
              <select
                aria-label="Categoría del servicio"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-7 sm:h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:border-ring"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="General">General</option>
                    <option value="Producción">Producción</option>
                    <option value="APIs & Backend">APIs & Backend</option>
                    <option value="Servicios Médicos">Servicios Médicos</option>
                  </>
                )}
              </select>
            </div>

            {/* Configuración HTTP Específica */}
            {checkType === 'HTTP' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                    Método HTTP
                  </label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'POST' | 'HEAD')}
                    className="w-full h-7 sm:h-8 px-2 rounded-md border border-input bg-background text-xs outline-none focus:border-ring"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                    Código Esperado
                  </label>
                  <Input
                    type="number"
                    min="100"
                    max="599"
                    value={expectedStatus}
                    onChange={(e) => setExpectedStatus(Number(e.target.value))}
                    className="h-7 sm:h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Parámetros de Tiempo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                  Intervalo (seg)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="3600"
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="h-7 sm:h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-semibold text-foreground">
                  Timeout (ms)
                </label>
                <Input
                  type="number"
                  min="1000"
                  max="60000"
                  step="500"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  className="h-7 sm:h-8 text-xs"
                />
              </div>
            </div>

            {/* Toggle Opciones Avanzadas HTTP */}
            {checkType === 'HTTP' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Code2 className="w-3 h-3" />
                  {showAdvanced ? 'Ocultar Opciones Avanzadas (Payload/Headers)' : 'Mostrar Opciones Avanzadas (Validación de Body y Headers)'}
                </button>

                {showAdvanced && (
                  <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/70 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-foreground block">
                        Palabra clave en respuesta (Body Validation)
                      </label>
                      <Input
                        placeholder='Ej. "healthy", "status: ok" o "UP"'
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="h-7 sm:h-8 text-xs"
                      />
                      <p className="text-[9px] text-muted-foreground">
                        Si se especifica, el servicio solo se marcará Operativo si esta cadena aparece en el cuerpo recibido.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-foreground block">
                        Cabeceras HTTP Personalizadas (JSON)
                      </label>
                      <Input
                        placeholder='{"Authorization": "Bearer token123", "x-api-key": "secret"}'
                        value={headers}
                        onChange={(e) => setHeaders(e.target.value)}
                        className="h-7 sm:h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Estado Activo / Inactivo */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border">
              <div className="min-w-0 mr-1">
                <div className="text-[10px] sm:text-xs font-semibold">Servicio Activo</div>
                <div className="text-[8px] sm:text-[9px] text-muted-foreground">
                  Habilitar comprobación continua 24/7 en segundo plano
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-1.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-7 sm:h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-7 sm:h-8 text-xs">
              {loading ? 'Guardando...' : serviceToEdit ? 'Actualizar' : 'Guardar y Verificar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
