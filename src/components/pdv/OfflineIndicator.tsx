import { WifiOff, Wifi, CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingSalesCount: number;
  lastSync: Date | null;
  onSync?: () => void;
  syncing?: boolean;
}

export function OfflineIndicator({
  isOnline,
  pendingSalesCount,
  lastSync,
  onSync,
  syncing,
}: OfflineIndicatorProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isOnline
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline
                ? "Conectado ao servidor"
                : "Modo offline - vendas serão sincronizadas quando a conexão for restaurada"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Pending Sales */}
        {pendingSalesCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1.5 bg-warning/10 text-warning border-warning/20">
                <CloudOff className="h-3 w-3" />
                {pendingSalesCount} pendente{pendingSalesCount > 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {pendingSalesCount} venda{pendingSalesCount > 1 ? 's' : ''} aguardando sincronização
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Last Sync */}
        {lastSync && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                Sync: {format(lastSync, "HH:mm", { locale: ptBR })}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Última sincronização: {format(lastSync, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Button */}
        {isOnline && pendingSalesCount > 0 && onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={syncing}
            className="h-7 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            Sincronizar
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
