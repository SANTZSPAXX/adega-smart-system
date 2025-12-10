import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Chrome } from 'lucide-react';
import { z } from 'zod';
import techcontrolLogo from '@/assets/techcontrol-logo.png';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511956614601";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', confirmPassword: '', fullName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        toast({
          title: 'Erro ao entrar com Google',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Google login error:', err);
      setIsLoading(false);
    }
  };

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
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active, expires_at')
      .eq('email', loginData.email)
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

    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
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

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
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
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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

                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    size="lg" 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Entrar com Google
                  </Button>

                  {/* Forgot Password */}
                  <div className="text-center pt-2">
                    <a 
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Esqueceu a senha? Fale conosco: (11) 95661-4601
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
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

                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    size="lg" 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Cadastrar com Google
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="text-center mt-4 space-y-2">
          <a 
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-green-500 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Desenvolvido por TechControl • WhatsApp: (11) 95661-4601
          </a>
        </div>
      </div>
    </div>
  );
}