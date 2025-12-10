import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Coins } from 'lucide-react';

interface ChangeCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total?: number;
}

export function ChangeCalculatorDialog({ open, onOpenChange, total = 0 }: ChangeCalculatorDialogProps) {
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState<number>(0);

  useEffect(() => {
    const received = parseFloat(amountReceived.replace(',', '.')) || 0;
    setChange(received - total);
  }, [amountReceived, total]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const quickAmounts = [10, 20, 50, 100, 200];

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  const handleClear = () => {
    setAmountReceived('');
    setChange(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Calculadora de Troco
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total da Venda */}
          <div className="p-4 bg-secondary/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Total da Venda</p>
            <p className="text-2xl font-bold text-primary font-mono">{formatCurrency(total)}</p>
          </div>

          {/* Valor Recebido */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor Recebido</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              className="text-lg font-mono text-center h-12"
              autoFocus
            />
          </div>

          {/* Valores Rápidos */}
          <div className="flex flex-wrap gap-2 justify-center">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="min-w-[60px]"
              >
                R$ {amount}
              </Button>
            ))}
          </div>

          {/* Troco */}
          <div className={`p-4 rounded-lg text-center ${
            change >= 0 
              ? 'bg-primary/10 border border-primary/30' 
              : 'bg-destructive/10 border border-destructive/30'
          }`}>
            <p className="text-sm text-muted-foreground">
              {change >= 0 ? 'Troco a Devolver' : 'Falta Receber'}
            </p>
            <p className={`text-3xl font-bold font-mono ${
              change >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {formatCurrency(Math.abs(change))}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Limpar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
