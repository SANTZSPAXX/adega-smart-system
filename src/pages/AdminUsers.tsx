import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Plus, Trash2, Shield, Lock } from 'lucide-react';
import { useEffect } from 'react';

const ADMIN_PASSWORD = '0000';

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '' });

  useEffect(() => {
    if (authenticated) fetchUsers();
  }, [authenticated]);

  const authenticate = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast({ title: 'Acesso liberado' });
    } else {
      toast({ title: 'Senha incorreta', variant: 'destructive' });
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*, user_roles(role)');
    if (data) setUsers(data);
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Preencha email e senha', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: { data: { full_name: newUser.fullName } }
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Usuário criado!' });
      setShowCreateDialog(false);
      setNewUser({ email: '', password: '', fullName: '' });
      setTimeout(fetchUsers, 1000);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
    toast({ title: 'Promovido a admin!' });
    fetchUsers();
  };

  if (!authenticated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle>Painel Administrativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Senha de Admin</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••" onKeyDown={e => e.key === 'Enter' && authenticate()} /></div>
              <Button className="w-full" onClick={authenticate}>Acessar</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Gestão de Usuários</h1><p className="text-muted-foreground">Criar e gerenciar contas</p></div>
          <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
        </div>
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Email</TableHead><TableHead>Função</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
          {users.map(u => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name || 'Sem nome'}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.user_roles?.[0]?.role === 'admin' ? <span className="text-primary font-medium">Admin</span> : 'Usuário'}</TableCell>
              <TableCell className="text-right">{u.user_roles?.[0]?.role !== 'admin' && <Button variant="outline" size="sm" onClick={() => promoteToAdmin(u.id)}><Shield className="h-4 w-4 mr-1" />Tornar Admin</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></CardContent></Card>
      </div>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}><DialogContent><DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Nome</Label><Input value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} /></div><div><Label>Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div><div><Label>Senha *</Label><Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button><Button onClick={createUser}>Criar</Button></DialogFooter></DialogContent></Dialog>
    </AppLayout>
  );
}
