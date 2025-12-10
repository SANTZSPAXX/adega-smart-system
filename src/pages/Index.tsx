import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl">
          <Store className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">Adega PDV</h1>
        <p className="text-muted-foreground">Sistema de Gestão Comercial</p>
        <Button size="lg" onClick={() => navigate('/auth')}>Acessar Sistema</Button>
      </div>
    </div>
  );
};

export default Index;
