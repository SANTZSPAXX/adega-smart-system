import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div><h1 className="text-3xl font-bold">Relatórios</h1><p className="text-muted-foreground">Análises e métricas</p></div>
        <Card><CardContent className="py-12 text-center"><BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Em breve: Curva ABC, Fechamento de Caixa, Análise de Vendas</p></CardContent></Card>
      </div>
    </AppLayout>
  );
}
