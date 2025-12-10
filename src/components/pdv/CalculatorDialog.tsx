import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calculator, Delete } from 'lucide-react';

interface CalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalculatorDialog({ open, onOpenChange }: CalculatorDialogProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue: number;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '*':
          newValue = currentValue * inputValue;
          break;
        case '/':
          newValue = currentValue / inputValue;
          break;
        case '%':
          newValue = (currentValue * inputValue) / 100;
          break;
        default:
          newValue = inputValue;
      }

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let newValue: number;

    switch (operation) {
      case '+':
        newValue = previousValue + inputValue;
        break;
      case '-':
        newValue = previousValue - inputValue;
        break;
      case '*':
        newValue = previousValue * inputValue;
        break;
      case '/':
        newValue = previousValue / inputValue;
        break;
      case '%':
        newValue = (previousValue * inputValue) / 100;
        break;
      default:
        return;
    }

    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (Number.isInteger(num) && value.indexOf('.') === -1) {
      return num.toLocaleString('pt-BR');
    }
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };

  const buttons = [
    { label: 'C', action: clear, className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
    { label: '%', action: () => performOperation('%'), className: 'bg-secondary' },
    { label: '÷', action: () => performOperation('/'), className: 'bg-primary/10 text-primary' },
    { label: '×', action: () => performOperation('*'), className: 'bg-primary/10 text-primary' },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '-', action: () => performOperation('-'), className: 'bg-primary/10 text-primary' },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '+', action: () => performOperation('+'), className: 'bg-primary/10 text-primary' },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '=', action: calculate, className: 'bg-primary text-primary-foreground hover:bg-primary/90 row-span-2', rowSpan: true },
    { label: '0', action: () => inputDigit('0'), className: 'col-span-2' },
    { label: ',', action: inputDecimal },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display */}
          <div className="p-4 bg-secondary rounded-lg">
            <div className="text-right">
              {previousValue !== null && operation && (
                <div className="text-sm text-muted-foreground mb-1">
                  {previousValue.toLocaleString('pt-BR')} {operation === '*' ? '×' : operation === '/' ? '÷' : operation}
                </div>
              )}
              <div className="text-3xl font-mono font-bold truncate">
                {formatDisplay(display)}
              </div>
            </div>
          </div>

          {/* Backspace */}
          <Button
            variant="outline"
            className="w-full"
            onClick={backspace}
          >
            <Delete className="h-4 w-4 mr-2" />
            Apagar
          </Button>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((btn, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-14 text-lg font-semibold ${btn.className || ''} ${
                  btn.label === '0' ? 'col-span-2' : ''
                }`}
                onClick={btn.action}
                style={btn.rowSpan ? { gridRow: 'span 2' } : undefined}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
