import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Eye, FileText } from 'lucide-react';
import { generateReceiptPDF, downloadPDF, printPDF } from '@/utils/pdfGenerator';

interface SaleWithItems {
  id: string;
  total: number;
  discount: number;
  payment_method: string;
  created_at: string;
  status: string;
  customer?: { name: string } | null;
  items: { product_name: string; quantity: number; unit_price: number; total_price: number }[];
}

interface SalesHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesHistory({ open, onOpenChange }: SalesHistoryProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchSales();
    }
  }, [open, user]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (salesData) {
        const salesWithItems = await Promise.all(
          salesData.map(async (sale) => {
            const { data: items } = await supabase
              .from('sale_items')
              .select('*')
              .eq('sale_id', sale.id);
            return {
              ...sale,
              customer: sale.customer as { name: string } | null,
              items: items || [],
            };
          })
        );
        setSales(salesWithItems);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (sale: SaleWithItems) => {
    const doc = generateReceiptPDF({
      id: sale.id,
      items: sale.items,
      total: sale.total,
      discount: sale.discount,
      payment_method: sale.payment_method,
      created_at: sale.created_at,
      customer_name: sale.customer?.name,
    });
    printPDF(doc);
  };

  const handleDownload = (sale: SaleWithItems) => {
    const doc = generateReceiptPDF({
      id: sale.id,
      items: sale.items,
      total: sale.total,
      discount: sale.discount,
      payment_method: sale.payment_method,
      created_at: sale.created_at,
      customer_name: sale.customer?.name,
    });
    downloadPDF(doc, `recibo_${sale.id.substring(0, 8)}.pdf`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Crédito',
    cartao_debito: 'Débito',
    pix: 'PIX',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Vendas
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 border rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{sale.id.substring(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="outline">{paymentLabels[sale.payment_method]}</Badge>
                    </div>
                    <span className="font-bold text-primary font-mono">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span>
                      {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span>{sale.items.length} item(ns)</span>
                  </div>

                  {sale.customer && (
                    <p className="text-sm mb-3">Cliente: {sale.customer.name}</p>
                  )}

                  {selectedSale?.id === sale.id && (
                    <div className="mt-3 p-3 bg-secondary/50 rounded-lg space-y-2">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-mono">{formatCurrency(item.total_price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedSale?.id === sale.id ? 'Ocultar' : 'Detalhes'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePrint(sale)}>
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimir
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(sale)}>
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
