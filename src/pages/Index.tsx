import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import techcontrolLogo from "@/assets/techcontrol-logo.png";

const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511956614601";

const Index = () => {
  const navigate = useNavigate();

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
        
        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-[#1e88e5] to-[#4dd0e1] hover:from-[#1565c0] hover:to-[#26c6da] text-white font-semibold px-10 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-300"
          >
            Acessar Sistema
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
    </div>
  );
};

export default Index;