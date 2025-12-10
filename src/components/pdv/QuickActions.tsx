import { Button } from '@/components/ui/button';
import { 
  Percent, 
  UserPlus, 
  Package, 
  Calculator, 
  History, 
  FileText,
  Printer,
  Settings,
  BarChart3
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickActionsProps {
  onAddDiscount: () => void;
  onAddCustomer: () => void;
  onQuickProduct: () => void;
  onCalculator: () => void;
  onSalesHistory: () => void;
  onGenerateReceipt: () => void;
  onOpenReports: () => void;
}

export function QuickActions({
  onAddDiscount,
  onAddCustomer,
  onQuickProduct,
  onCalculator,
  onSalesHistory,
  onGenerateReceipt,
  onOpenReports,
}: QuickActionsProps) {
  const actions = [
    { icon: Percent, label: 'Desconto', onClick: onAddDiscount, color: 'text-warning' },
    { icon: UserPlus, label: 'Cliente', onClick: onAddCustomer, color: 'text-primary' },
    { icon: Package, label: 'Produto Rápido', onClick: onQuickProduct, color: 'text-success' },
    { icon: Calculator, label: 'Calculadora', onClick: onCalculator, color: 'text-accent' },
    { icon: History, label: 'Histórico', onClick: onSalesHistory, color: 'text-muted-foreground' },
    { icon: Printer, label: 'Imprimir', onClick: onGenerateReceipt, color: 'text-primary' },
    { icon: BarChart3, label: 'Relatórios', onClick: onOpenReports, color: 'text-chart-4' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-secondary/30 rounded-lg">
        {actions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                className={`h-9 w-9 p-0 hover:bg-secondary ${action.color}`}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{action.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
