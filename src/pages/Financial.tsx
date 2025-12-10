import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function Financial() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div><h1 className="text-3xl font-bold">Financeiro</h1><p className="text-muted-foreground">Controle financeiro</p></div>
        <Card><CardContent className="py-12 text-center"><Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Em breve: Contas a Pagar/Receber, Fluxo de Caixa</p></CardContent></Card>
      </div>
    </AppLayout>
  );
}
