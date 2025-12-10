import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/database';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Award } from 'lucide-react';

export default function Customers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '', address: '' });

  useEffect(() => { if (user) fetchCustomers(); }, [user]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data as Customer[]);
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm));

  const openDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '', cpf: customer.cpf || '', address: customer.address || '' });
    } else {
      setEditingCustomer(null);
      setForm({ name: '', email: '', phone: '', cpf: '', address: '' });
    }
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name) { toast({ title: 'Nome é obrigatório', variant: 'destructive' }); return; }
    const data = { user_id: user!.id, ...form };
    const { error } = editingCustomer 
      ? await supabase.from('customers').update(data).eq('id', editingCustomer.id)
      : await supabase.from('customers').insert(data);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Salvo!' }); setShowDialog(false); fetchCustomers(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir cliente?')) return;
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Clientes</h1><p className="text-muted-foreground">Cadastro e fidelização</p></div>
          <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
        </div>
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <Card><CardContent className="p-0"><ScrollArea className="h-[calc(100vh-280px)]"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contato</TableHead><TableHead className="text-center">Pontos</TableHead><TableHead className="text-right">Total Compras</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map(c => (
            <TableRow key={c.id} className="table-row-hover">
              <TableCell><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div><div><p className="font-medium">{c.name}</p>{c.cpf && <p className="text-xs text-muted-foreground">{c.cpf}</p>}</div></div></TableCell>
              <TableCell><div className="space-y-1">{c.phone && <p className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{c.phone}</p>}{c.email && <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</p>}</div></TableCell>
              <TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Award className="h-4 w-4 text-warning" /><span className="font-bold">{c.loyalty_points}</span></div></TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(Number(c.total_purchases))}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon-sm" onClick={() => openDialog(c)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></ScrollArea></CardContent></Card>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent><DialogHeader><DialogTitle>{editingCustomer ? 'Editar' : 'Novo'} Cliente</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div><div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} /></div></div><div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div><div><Label>Endereço</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    </AppLayout>
  );
}
