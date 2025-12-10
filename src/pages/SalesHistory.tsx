import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, Eye, FileText, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { generateReceiptPDF, downloadPDF, printPDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleWithItems {
  id: string;
  total: number;
  discount: number;
  payment_method: string;
  created_at: string;
  status: string;
  customer?: { name: string } | null;
  items: SaleItem[];
}

export default function SalesHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const lastDataHash = useRef<string>('');

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user]);

  // Real-time subscription for new sales
  useEffect(() => {
    const channel = supabase
      .channel('sales-history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchSales(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSales = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (salesData) {
        const dataHash = JSON.stringify(salesData.map(s => s.id + s.total));
        
        // Only update if data changed
        if (dataHash !== lastDataHash.current || !silent) {
          lastDataHash.current = dataHash;
          
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
    toast({ title: 'PDF gerado com sucesso!' });
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;
    
    try {
      // First delete sale items
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      
      // Then delete the sale
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      
      if (error) throw error;
      
      toast({ title: 'Venda excluída com sucesso!' });
      fetchSales();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir venda', description: error.message, variant: 'destructive' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Crédito',
    cartao_debito: 'Débito',
    pix: 'PIX',
    'dinheiro_cartao': 'Dinheiro + Cartão',
    'pix_cartao': 'PIX + Cartão',
  };

  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paymentLabels[sale.payment_method]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Histórico de Vendas</h1>
            <p className="text-muted-foreground">Visualize e gerencie todas as vendas realizadas</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, cliente ou pagamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma venda encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <>
                        <TableRow key={sale.id} className="table-row-hover cursor-pointer" onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}>
                          <TableCell>
                            <span className="font-mono text-sm text-muted-foreground">
                              #{sale.id.substring(0, 8).toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{sale.customer?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{paymentLabels[sale.payment_method] || sale.payment_method}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{sale.items.length}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon-sm" onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}>
                                {expandedSale === sale.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handlePrint(sale)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(sale)}>
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(sale.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedSale === sale.id && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-secondary/30 p-4">
                              <div className="space-y-2">
                                <p className="font-medium text-sm mb-2">Itens da Venda:</p>
                                {sale.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                    <span>
                                      {item.quantity}x {item.product_name}
                                    </span>
                                    <span className="font-mono">{formatCurrency(item.total_price)}</span>
                                  </div>
                                ))}
                                {sale.discount > 0 && (
                                  <div className="flex justify-between text-sm text-muted-foreground pt-2">
                                    <span>Desconto:</span>
                                    <span className="font-mono">-{formatCurrency(sale.discount)}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
