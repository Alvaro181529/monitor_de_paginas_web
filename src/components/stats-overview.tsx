'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Globe, CheckCircle2, AlertOctagon, Zap } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    up: number;
    down: number;
    degraded: number;
    active: number;
    avgLatency: number;
    uptimeAvg: number;
  };
}

export function StatsOverview({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5 w-full">
      {/* TOTAL */}
      <Card className="border border-border/60 shadow-xs min-w-0">
        <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Total Sitios
            </p>
            <h3 className="text-lg sm:text-2xl font-bold mt-0.5 text-foreground leading-tight">
              {stats.total}
            </h3>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              {stats.active} activos
            </p>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-blue-500/10 text-blue-500 rounded-lg flex-shrink-0">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </CardContent>
      </Card>

      {/* OPERATIVOS */}
      <Card className="border border-border/60 shadow-xs min-w-0">
        <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Operativos
            </p>
            <h3 className="text-lg sm:text-2xl font-bold mt-0.5 text-emerald-500 leading-tight">
              {stats.up}
            </h3>
            <p className="text-[9px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 truncate">
              {stats.uptimeAvg}% uptime
            </p>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </CardContent>
      </Card>

      {/* CAÍDOS O CON PROBLEMAS */}
      <Card className="border border-border/60 shadow-xs min-w-0">
        <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Caídos
            </p>
            <h3
              className={`text-lg sm:text-2xl font-bold mt-0.5 leading-tight ${
                stats.down > 0 ? 'text-red-500' : 'text-foreground'
              }`}
            >
              {stats.down}
            </h3>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              {stats.degraded > 0 ? `${stats.degraded} lentos` : '0 incidentes'}
            </p>
          </div>
          <div
            className={`p-1.5 sm:p-2.5 rounded-lg flex-shrink-0 ${
              stats.down > 0 ? 'bg-red-500/15 text-red-500' : 'bg-muted text-muted-foreground'
            }`}
          >
            <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </CardContent>
      </Card>

      {/* LATENCIA PROMEDIO */}
      <Card className="border border-border/60 shadow-xs min-w-0">
        <CardContent className="p-2.5 sm:p-4 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              Latencia
            </p>
            <h3 className="text-lg sm:text-2xl font-bold mt-0.5 text-foreground leading-tight truncate">
              {stats.avgLatency}{' '}
              <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">ms</span>
            </h3>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              Promedio
            </p>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-amber-500/10 text-amber-500 rounded-lg flex-shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
