import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Wallet, TrendingUp, TrendingDown, Plus, Check, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { FinancialTransaction } from '@/types/database';
import { utils, writeFile } from 'xlsx';

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: 0,
    due_date: '',
    status: 'pending' as 'pending' | 'paid'
  });

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false });
    
    if (data) setTransactions(data as FinancialTransaction[]);
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === (filter === 'income' ? 'receita' : 'despesa');
  });

  const totals = {
    income: transactions.filter(t => t.type === 'receita' && t.status === 'paid').reduce((a, t) => a + Number(t.amount), 0),
    expense: transactions.filter(t => t.type === 'despesa' && t.status === 'paid').reduce((a, t) => a + Number(t.amount), 0),
    pending: transactions.filter(t => t.status === 'pending').reduce((a, t) => a + Number(t.amount), 0)
  };

  const saveTransaction = async () => {
    if (!user || !form.category || !form.amount) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('financial_transactions').insert({
      user_id: user.id,
      type: form.type === 'income' ? 'receita' : 'despesa',
      category: form.category,
      description: form.description,
      amount: form.amount,
      due_date: form.due_date || null,
      status: form.status,
      paid_date: form.status === 'paid' ? new Date().toISOString().split('T')[0] : null
    });

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Transação registrada!' });
      setShowDialog(false);
      setForm({ type: 'income', category: '', description: '', amount: 0, due_date: '', status: 'pending' });
      fetchTransactions();
    }
  };

  const markAsPaid = async (t: FinancialTransaction) => {
    await supabase.from('financial_transactions').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0]
    }).eq('id', t.id);
    toast({ title: 'Marcado como pago!' });
    fetchTransactions();
  };

  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      'Tipo': t.type === 'receita' ? 'Receita' : 'Despesa',
      'Categoria': t.category,
      'Descrição': t.description || '',
      'Valor': t.amount,
      'Vencimento': t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '',
      'Status': t.status === 'paid' ? 'Pago' : 'Pendente',
      'Data Pagamento': t.paid_date ? format(new Date(t.paid_date), 'dd/MM/yyyy') : ''
    }));
    
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Financeiro');
    writeFile(wb, `financeiro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Exportado com sucesso!' });
  };

  const categories = {
    income: ['Vendas', 'Serviços', 'Comissões', 'Outros'],
    expense: ['Fornecedores', 'Aluguel', 'Salários', 'Impostos', 'Luz/Água', 'Internet', 'Marketing', 'Outros']
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">Contas a pagar e receber</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Nova Transação
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  <p className="text-2xl font-bold text-green-600">R$ {totals.income.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-red-600">R$ {totals.expense.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {(totals.income - totals.expense).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Wallet className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">R$ {totals.pending.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Todas</Button>
              <Button variant={filter === 'income' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('income')}>Receitas</Button>
              <Button variant={filter === 'expense' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('expense')}>Despesas</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant={t.type === 'receita' ? 'default' : 'destructive'}>
                        {t.type === 'receita' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>{t.description || '-'}</TableCell>
                    <TableCell className={t.type === 'receita' ? 'text-green-600' : 'text-red-600'}>
                      {t.type === 'receita' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'paid' ? 'secondary' : 'outline'}>
                        {t.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => markAsPaid(t)}>
                          <Check className="h-4 w-4 mr-1" />Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v as 'income' | 'expense', category: ''})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories[form.type].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v as 'pending' | 'paid'})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveTransaction}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
