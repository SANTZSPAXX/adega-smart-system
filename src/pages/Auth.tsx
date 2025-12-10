import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, User } from 'lucide-react';
import { z } from 'zod';
import techcontrolLogo from '@/assets/techcontrol-logo.png';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Preencha email ou usuário'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres').regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e _'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'username'>('email');
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', username: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    let email = loginData.identifier;
    
    // If logging in with username, first find the email
    if (loginMethod === 'username') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, is_active, expires_at')
        .eq('username', loginData.identifier)
        .maybeSingle();
      
      if (!profile?.email) {
        toast({ title: 'Usuário não encontrado', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Check if user is active
      if (profile.is_active === false) {
        toast({ title: 'Conta desativada', description: 'Entre em contato com o administrador', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Check expiration
      if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
        toast({ title: 'Acesso expirado', description: 'Seu acesso expirou. Entre em contato: (11) 95661-4601', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      email = profile.email;
    } else {
      // Check if logging in with email - verify active and expiration
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, expires_at')
        .eq('email', loginData.identifier)
        .maybeSingle();
      
      if (profile) {
        if (profile.is_active === false) {
          toast({ title: 'Conta desativada', description: 'Entre em contato com o administrador', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        if (profile.expires_at && new Date(profile.expires_at) < new Date()) {
          toast({ title: 'Acesso expirado', description: 'Seu acesso expirou. Entre em contato: (11) 95661-4601', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }
    }

    const { error } = await signIn(email, loginData.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email/usuário ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', signupData.username)
      .maybeSingle();

    if (existingUser) {
      setErrors({ username: 'Este username já está em uso' });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    
    if (!error) {
      // Update profile with username
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ username: signupData.username }).eq('id', user.id);
      }
    }
    
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message.includes('already registered') 
          ? 'Este email já está cadastrado' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Conta criada!', description: 'Você pode fazer login agora.' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={techcontrolLogo} alt="TechControl" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">TechControl PDV</h1>
          <p className="text-muted-foreground mt-2">Sistema de Gestão Comercial</p>
        </div>

        <Card className="shadow-xl border-border/50">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Login Method Toggle */}
                  <div className="flex gap-2 mb-4">
                    <Button 
                      type="button"
                      variant={loginMethod === 'email' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setLoginMethod('email')}
                      className="flex-1"
                    >
                      <Mail className="h-4 w-4 mr-2" />Email
                    </Button>
                    <Button 
                      type="button"
                      variant={loginMethod === 'username' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setLoginMethod('username')}
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />Usuário
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-identifier">
                      {loginMethod === 'email' ? 'Email' : 'Nome de Usuário'}
                    </Label>
                    <Input
                      id="login-identifier"
                      type={loginMethod === 'email' ? 'email' : 'text'}
                      placeholder={loginMethod === 'email' ? 'seu@email.com' : 'seu_usuario'}
                      value={loginData.identifier}
                      onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                    />
                    {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      />
                      {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="usuario123"
                        value={signupData.username}
                        onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                      />
                      {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Desenvolvido por TechControl • WhatsApp: (11) 95661-4601
        </p>
      </div>
    </div>
  );
}
