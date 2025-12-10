import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Plus, Edit, Shield, Lock, Users, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import techcontrolLogo from '@/assets/techcontrol-logo.png';

const ADMIN_PASSWORD = '0000';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  user_roles: { role: string }[] | null;
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    role: 'user' as 'user' | 'reseller' | 'admin',
    expiresAt: ''
  });

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
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profiles) {
      const usersWithRoles = await Promise.all(profiles.map(async (p) => {
        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', p.id);
        return { ...p, user_roles: roles } as UserWithRole;
      }));
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Preencha email e senha', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: { 
          full_name: newUser.fullName,
          username: newUser.username
        }
      }
    });

    if (authError) {
      toast({ title: 'Erro', description: authError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Update profile with extra fields
      await supabase.from('profiles').update({
        username: newUser.username,
        expires_at: newUser.expiresAt || null,
        is_active: true
      }).eq('id', authData.user.id);

      // Set role if not default user
      if (newUser.role !== 'user') {
        await supabase.from('user_roles').update({ role: newUser.role }).eq('user_id', authData.user.id);
      }
    }

    toast({ title: 'Usuário criado!' });
    setShowCreateDialog(false);
    setNewUser({ email: '', password: '', fullName: '', username: '', role: 'user', expiresAt: '' });
    setTimeout(fetchUsers, 1000);
    setLoading(false);
  };

  const updateRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').update({ role: role as any }).eq('user_id', userId);
    toast({ title: `Função atualizada para ${role}!` });
    fetchUsers();
  };

  const toggleActive = async (user: UserWithRole) => {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    toast({ title: user.is_active ? 'Usuário desativado' : 'Usuário ativado' });
    fetchUsers();
  };

  const updateExpiration = async () => {
    if (!editingUser) return;
    
    await supabase.from('profiles').update({
      expires_at: editingUser.expires_at || null
    }).eq('id', editingUser.id);

    toast({ title: 'Expiração atualizada!' });
    setShowEditDialog(false);
    fetchUsers();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-500">Admin</Badge>;
      case 'reseller': return <Badge className="bg-blue-500">Revendedor</Badge>;
      default: return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (!authenticated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <img src={techcontrolLogo} alt="TechControl" className="h-16 mx-auto mb-4" />
              <Lock className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle>Painel Administrativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Senha de Admin</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••" 
                  onKeyDown={e => e.key === 'Enter' && authenticate()} 
                />
              </div>
              <Button className="w-full" onClick={authenticate}>Acessar</Button>
              <p className="text-xs text-center text-muted-foreground">
                Acesso restrito a administradores
              </p>
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
          <div>
            <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
            <p className="text-muted-foreground">Criar e gerenciar contas de acesso</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />Novo Usuário
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <UserCheck className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl">
                  <UserX className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expirados</p>
                  <p className="text-2xl font-bold">{users.filter(u => isExpired(u.expires_at)).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} className={isExpired(u.expires_at) ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{u.full_name || 'Sem nome'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.username || '-'}</TableCell>
                    <TableCell>{getRoleBadge(u.user_roles?.[0]?.role || 'user')}</TableCell>
                    <TableCell>
                      {u.expires_at ? (
                        <span className={isExpired(u.expires_at) ? 'text-red-500' : ''}>
                          {format(new Date(u.expires_at), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sem limite</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={u.is_active} onCheckedChange={() => toggleActive(u)} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setEditingUser(u); setShowEditDialog(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Select 
                        value={u.user_roles?.[0]?.role || 'user'} 
                        onValueChange={(v) => updateRole(u.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="reseller">Revendedor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={techcontrolLogo} alt="TechControl" className="h-8" />
              <div>
                <p className="font-medium text-sm">Para adquirir acesso completo</p>
                <p className="text-xs text-muted-foreground">WhatsApp: (11) 95661-4601</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input 
                  value={newUser.fullName} 
                  onChange={e => setNewUser({...newUser, fullName: e.target.value})} 
                />
              </div>
              <div>
                <Label>Username</Label>
                <Input 
                  value={newUser.username} 
                  onChange={e => setNewUser({...newUser, username: e.target.value})} 
                  placeholder="usuario123"
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input 
                type="email" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
              />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input 
                type="password" 
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Função</Label>
                <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="reseller">Revendedor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expira em</Label>
                <Input 
                  type="date" 
                  value={newUser.expiresAt} 
                  onChange={e => setNewUser({...newUser, expiresAt: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={createUser} disabled={loading}>Criar Usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Expiração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usuário</Label>
              <Input value={editingUser?.full_name || editingUser?.email || ''} disabled />
            </div>
            <div>
              <Label>Data de Expiração</Label>
              <Input 
                type="date" 
                value={editingUser?.expires_at?.split('T')[0] || ''} 
                onChange={e => setEditingUser(prev => prev ? {...prev, expires_at: e.target.value} : null)} 
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para acesso ilimitado</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={updateExpiration}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
