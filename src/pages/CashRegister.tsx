import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePageVisibility, usePageCache } from '@/hooks/usePageVisibility';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Calculator, CreditCard, Banknote, Smartphone, FileText, Plus } from 'lucide-react';
import { generateCashRegisterClosingPDF, downloadPDF } from '@/utils/pdfGenerator';

interface CashRegister {
  id: string;
  user_id: string;
  opening_balance: number;
  closing_balance: number | null;
  cash_sales: number;
  card_sales: number;
  pix_sales: number;
  deposits: number;
  withdrawals: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  register_name: string;
  operator_name: string | null;
}

export default function CashRegisterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isVisible = usePageVisibility();
  const { getFromCache, setToCache } = usePageCache<CashRegister[]>('cash_registers');
  
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [registerName, setRegisterName] = useState('Caixa 01');
  const [operatorName, setOperatorName] = useState('');
  const [closingSales, setClosingSales] = useState<any[]>([]);
  const lastDataHash = useRef<string>('');

  useEffect(() => {
    if (user && isVisible) {
      // Try to load from cache first
      const cached = getFromCache();
      if (cached) {
        const openReg = cached.find(r => r.status === 'open');
        setCurrentRegister(openReg || null);
        setRegisters(cached);
        setLoading(false);
      }
      fetchCashRegisters();
    }
  }, [user, isVisible]);

  // Real-time subscription
  useEffect(() => {
    if (!isVisible) return;
    
    const channel = supabase
      .channel('cash-register')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_register' },
        () => {
          fetchCashRegisters(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchCashRegisters(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVisible]);

  const fetchCashRegisters = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: openRegister } = await supabase
        .from('cash_register')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'open')
        .maybeSingle();

      const { data: allRegisters } = await supabase
        .from('cash_register')
        .select('*')
        .eq('user_id', user!.id)
        .order('opened_at', { ascending: false })
        .limit(50);

      const dataHash = JSON.stringify(allRegisters?.map(r => r.id + r.status + r.cash_sales + r.card_sales + r.pix_sales));
      
      if (dataHash !== lastDataHash.current || !silent) {
        lastDataHash.current = dataHash;
        setCurrentRegister(openRegister as CashRegister | null);
        setRegisters(allRegisters as CashRegister[] || []);
        if (allRegisters) {
          setToCache(allRegisters as CashRegister[]);
        }
      }
    } catch (error) {
      console.error('Error fetching cash registers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCashRegister = async () => {
    if (!openingBalance) {
      toast({ title: 'Informe o saldo inicial', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_register')
        .insert({
          user_id: user!.id,
          opening_balance: Number(openingBalance),
          status: 'open',
          register_name: registerName,
          operator_name: operatorName || null,
        });

      if (error) throw error;

      toast({ title: 'Caixa aberto com sucesso!' });
      setShowOpenDialog(false);
      setOpeningBalance('');
      setRegisterName('Caixa 01');
      setOperatorName('');
      fetchCashRegisters();
    } catch (error: any) {
      toast({ title: 'Erro ao abrir caixa', description: error.message, variant: 'destructive' });
    }
  };

  const prepareCloseDialog = async () => {
    if (!currentRegister) return;
    
    // Fetch sales for this register period
    const { data: sales } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user!.id)
      .gte('created_at', currentRegister.opened_at)
      .order('created_at', { ascending: true });
    
    setClosingSales(sales?.map(sale => ({
      ...sale,
      items: sale.sale_items || []
    })) || []);
    setShowCloseDialog(true);
  };

  const closeCashRegister = async () => {
    if (!closingBalance || !currentRegister) {
      toast({ title: 'Informe o saldo final', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_register')
        .update({
          closing_balance: Number(closingBalance),
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', currentRegister.id);

      if (error) throw error;

      toast({ title: 'Caixa fechado com sucesso!' });
      setShowCloseDialog(false);
      setClosingBalance('');
      setClosingSales([]);
      fetchCashRegisters();
    } catch (error: any) {
      toast({ title: 'Erro ao fechar caixa', description: error.message, variant: 'destructive' });
    }
  };

  const handlePrintClosingReport = async (register: CashRegister) => {
    // Fetch sales for this register period
    const { data: sales } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user!.id)
      .gte('created_at', register.opened_at)
      .lte('created_at', register.closed_at || new Date().toISOString())
      .order('created_at', { ascending: true });
    
    const formattedSales = sales?.map(sale => ({
      id: sale.id,
      created_at: sale.created_at,
      total: sale.total,
      payment_method: sale.payment_method,
      items: sale.sale_items?.map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        total_price: item.total_price
      })) || []
    })) || [];
    
    const doc = generateCashRegisterClosingPDF(
      {
        ...register,
        closing_balance: register.closing_balance || 0,
        closed_at: register.closed_at || new Date().toISOString(),
      },
      formattedSales
    );
    downloadPDF(doc, `fechamento-caixa-${register.id.substring(0, 8)}.pdf`);
  };

  const handleMovement = async () => {
    if (!movementAmount || !currentRegister) {
      toast({ title: 'Informe o valor', variant: 'destructive' });
      return;
    }

    const amount = Number(movementAmount);
    const field = movementType === 'deposit' ? 'deposits' : 'withdrawals';
    const currentValue = currentRegister[field] || 0;

    try {
      const { error } = await supabase
        .from('cash_register')
        .update({
          [field]: currentValue + amount,
        })
        .eq('id', currentRegister.id);

      if (error) throw error;

      toast({ title: `${movementType === 'deposit' ? 'Suprimento' : 'Sangria'} registrado!` });
      setShowMovementDialog(false);
      setMovementAmount('');
      setMovementReason('');
      fetchCashRegisters();
    } catch (error: any) {
      toast({ title: 'Erro ao registrar movimentação', description: error.message, variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const calculateExpectedBalance = () => {
    if (!currentRegister) return 0;
    return (
      currentRegister.opening_balance +
      (currentRegister.cash_sales || 0) +
      (currentRegister.deposits || 0) -
      (currentRegister.withdrawals || 0)
    );
  };

  const calculateTotalSales = () => {
    if (!currentRegister) return 0;
    return (
      (currentRegister.cash_sales || 0) +
      (currentRegister.card_sales || 0) +
      (currentRegister.pix_sales || 0)
    );
  };

  const getRegisterDisplayName = (register: CashRegister) => {
    return register.operator_name 
      ? `${register.register_name} | ${register.operator_name}`
      : register.register_name;
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sistema de Caixa</h1>
            <p className="text-muted-foreground">Controle de abertura, fechamento e movimentações</p>
          </div>
          {!currentRegister ? (
            <Button onClick={() => setShowOpenDialog(true)}>
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Caixa
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setMovementType('deposit'); setShowMovementDialog(true); }}>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Suprimento
              </Button>
              <Button variant="outline" onClick={() => { setMovementType('withdrawal'); setShowMovementDialog(true); }}>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Sangria
              </Button>
              <Button onClick={prepareCloseDialog}>
                <Lock className="h-4 w-4 mr-2" />
                Fechar Caixa
              </Button>
            </div>
          )}
        </div>

        {/* Current Register Status */}
        {currentRegister && (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white">Aberto</Badge>
                    <span className="text-lg font-semibold">{getRegisterDisplayName(currentRegister)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Aberto em {format(new Date(currentRegister.opened_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                      <p className="text-2xl font-bold font-mono">{formatCurrency(currentRegister.opening_balance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Calculator className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Vendas</p>
                      <p className="text-2xl font-bold font-mono text-green-500">{formatCurrency(calculateTotalSales())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Esperado</p>
                      <p className="text-2xl font-bold font-mono text-blue-500">{formatCurrency(calculateExpectedBalance())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ArrowUpCircle className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sangrias</p>
                      <p className="text-2xl font-bold font-mono text-orange-500">{formatCurrency(currentRegister.withdrawals)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                    <Banknote className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dinheiro</p>
                      <p className="text-xl font-bold font-mono">{formatCurrency(currentRegister.cash_sales)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                    <CreditCard className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cartão</p>
                      <p className="text-xl font-bold font-mono">{formatCurrency(currentRegister.card_sales)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                    <Smartphone className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">PIX</p>
                      <p className="text-xl font-bold font-mono">{formatCurrency(currentRegister.pix_sales)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Caixas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caixa</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead className="text-right">Total Vendas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.map((register) => (
                    <TableRow key={register.id}>
                      <TableCell className="font-medium">
                        {getRegisterDisplayName(register)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(register.opened_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {register.closed_at 
                          ? format(new Date(register.closed_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-500">
                        {formatCurrency((register.cash_sales || 0) + (register.card_sales || 0) + (register.pix_sales || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        {register.status === 'open' ? (
                          <Badge className="bg-green-500 text-white">Aberto</Badge>
                        ) : (
                          <Badge variant="secondary">Fechado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {register.status === 'closed' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePrintClosingReport(register)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Open Cash Register Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Caixa</Label>
              <Select value={registerName} onValueChange={setRegisterName}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o caixa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Caixa 01">Caixa 01</SelectItem>
                  <SelectItem value="Caixa 02">Caixa 02</SelectItem>
                  <SelectItem value="Caixa 03">Caixa 03</SelectItem>
                  <SelectItem value="Caixa 04">Caixa 04</SelectItem>
                  <SelectItem value="Caixa 05">Caixa 05</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Operador</Label>
              <Input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Ex: Maria, João..."
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial (R$)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={openCashRegister}>
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Register Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Caixa - {currentRegister && getRegisterDisplayName(currentRegister)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Esperado:</span>
                <span className="font-mono font-bold">{formatCurrency(calculateExpectedBalance())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Vendas:</span>
                <span className="font-mono text-green-500">{formatCurrency(calculateTotalSales())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendas no período:</span>
                <span className="font-mono">{closingSales.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Saldo Final Conferido (R$)</Label>
              <Input
                type="number"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {closingBalance && Number(closingBalance) !== calculateExpectedBalance() && (
              <div className={`p-3 rounded-lg ${Number(closingBalance) > calculateExpectedBalance() ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                <p className="text-sm font-medium">
                  Diferença: {Number(closingBalance) > calculateExpectedBalance() ? '+' : ''} 
                  {formatCurrency(Number(closingBalance) - calculateExpectedBalance())}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={closeCashRegister}>
              Fechar e Gerar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'deposit' ? 'Suprimento de Caixa' : 'Sangria de Caixa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Descreva o motivo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
