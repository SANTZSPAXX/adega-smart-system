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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Percent, Plus, Edit, Trash2, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
}

export default function Discounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    min_purchase: 0,
    max_discount: '',
    valid_until: '',
    usage_limit: '',
    is_active: true
  });

  useEffect(() => {
    fetchDiscounts();
  }, [user]);

  const fetchDiscounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setDiscounts(data as Discount[]);
    setLoading(false);
  };

  const openDialog = (discount?: Discount) => {
    if (discount) {
      setEditing(discount);
      setForm({
        name: discount.name,
        type: discount.type,
        value: discount.value,
        min_purchase: discount.min_purchase,
        max_discount: discount.max_discount?.toString() || '',
        valid_until: discount.valid_until?.split('T')[0] || '',
        usage_limit: discount.usage_limit?.toString() || '',
        is_active: discount.is_active
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        type: 'percentage',
        value: 0,
        min_purchase: 0,
        max_discount: '',
        valid_until: '',
        usage_limit: '',
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const saveDiscount = async () => {
    if (!user || !form.name) {
      toast({ title: 'Preencha o nome do desconto', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: user.id,
      name: form.name,
      type: form.type,
      value: form.value,
      min_purchase: form.min_purchase,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      valid_until: form.valid_until || null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      is_active: form.is_active
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('discounts').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('discounts').insert(payload));
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Desconto atualizado!' : 'Desconto criado!' });
      setShowDialog(false);
      fetchDiscounts();
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm('Excluir este desconto?')) return;
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Desconto excluído!' });
      fetchDiscounts();
    }
  };

  const toggleActive = async (discount: Discount) => {
    await supabase.from('discounts').update({ is_active: !discount.is_active }).eq('id', discount.id);
    fetchDiscounts();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Descontos</h1>
            <p className="text-muted-foreground">Gerencie cupons e promoções</p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />Novo Desconto
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Tag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Descontos</p>
                  <p className="text-2xl font-bold">{discounts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <Percent className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{discounts.filter(d => d.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Tag className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usos Totais</p>
                  <p className="text-2xl font-bold">{discounts.reduce((a, d) => a + d.usage_count, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Descontos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Compra Mínima</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {d.type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.type === 'percentage' ? `${d.value}%` : `R$ ${d.value.toFixed(2)}`}
                    </TableCell>
                    <TableCell>R$ {d.min_purchase.toFixed(2)}</TableCell>
                    <TableCell>
                      {d.valid_until ? format(new Date(d.valid_until), 'dd/MM/yyyy') : 'Sem limite'}
                    </TableCell>
                    <TableCell>
                      {d.usage_count}{d.usage_limit ? `/${d.usage_limit}` : ''}
                    </TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(d)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDiscount(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {discounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum desconto cadastrado
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
            <DialogTitle>{editing ? 'Editar Desconto' : 'Novo Desconto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Desconto de Natal" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v as 'percentage' | 'fixed'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input type="number" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Compra Mínima</Label>
                <Input type="number" value={form.min_purchase} onChange={e => setForm({...form, min_purchase: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Desconto Máximo (R$)</Label>
                <Input type="number" value={form.max_discount} onChange={e => setForm({...form, max_discount: e.target.value})} placeholder="Sem limite" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Válido até</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} />
              </div>
              <div>
                <Label>Limite de Usos</Label>
                <Input type="number" value={form.usage_limit} onChange={e => setForm({...form, usage_limit: e.target.value})} placeholder="Sem limite" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>Desconto Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveDiscount}>{editing ? 'Atualizar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
