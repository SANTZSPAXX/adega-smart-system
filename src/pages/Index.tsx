import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Phone, Mail, CheckCircle, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import techcontrolLogo from "@/assets/techcontrol-logo.png";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [trialEmail, setTrialEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511956614601&text&type=phone_number&app_absent=0";

  const handleStartTrial = async () => {
    setEmailError("");
    
    const validation = emailSchema.safeParse(trialEmail);
    if (!validation.success) {
      setEmailError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    try {
      // Create trial user with 30-day expiration
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
      const tempPassword = `trial_${Date.now()}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: trialEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: "Usuário Trial",
            is_trial: true
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já possui uma conta. Faça login normalmente.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile with expiration
        await supabase.from('profiles').update({
          expires_at: expirationDate.toISOString(),
          full_name: "Usuário Trial"
        }).eq('id', data.user.id);
      }

      setTrialSuccess(true);
      toast({
        title: "Teste ativado!",
        description: "Você tem 30 dias de acesso gratuito."
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Erro ao criar teste",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1929] via-[#0d2137] to-[#0a1929] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-8 px-4">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={techcontrolLogo} 
            alt="TechControl Logo" 
            className="w-64 h-64 object-contain drop-shadow-2xl"
          />
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-[#1e88e5]">TECH</span>
            <span className="text-[#4dd0e1]">CONTROL</span>
          </h1>
          <p className="text-lg text-[#4dd0e1]/80 tracking-widest uppercase">Sistema de Gestão Comercial</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-[#1e88e5] to-[#4dd0e1] hover:from-[#1565c0] hover:to-[#26c6da] text-white font-semibold px-10 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-300"
          >
            Acessar Sistema
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => setShowTrialDialog(true)}
            className="border-[#4dd0e1] text-[#4dd0e1] hover:bg-[#4dd0e1]/10 font-semibold px-10 py-6 text-lg rounded-xl transition-all duration-300"
          >
            Testar 30 Dias Grátis
          </Button>
        </div>
        
        {/* Contact Info */}
        <div className="pt-8 space-y-3">
          <a 
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/30 hover:bg-green-500/20 transition-all cursor-pointer"
          >
            <MessageCircle className="h-5 w-5 text-green-400" />
            <span className="text-white/90 font-medium">Para comprar acesso completo:</span>
            <span className="text-green-400 font-bold">(11) 95661-4601</span>
          </a>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-center text-white/40 text-sm">
        <p>© 2024 TechControl - Todos os direitos reservados</p>
      </div>

      {/* Trial Dialog */}
      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Teste Grátis por 30 Dias
            </DialogTitle>
            <DialogDescription>
              Insira seu email para iniciar seu período de teste gratuito. Após 30 dias, entre em contato para continuar usando.
            </DialogDescription>
          </DialogHeader>
          
          {trialSuccess ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Teste Ativado!</h3>
                <p className="text-muted-foreground">Você será redirecionado para o login...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={trialEmail}
                  onChange={(e) => {
                    setTrialEmail(e.target.value);
                    setEmailError("");
                  }}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTrialDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleStartTrial} disabled={loading || !trialEmail}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Iniciar Teste Grátis
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
