import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileSpreadsheet, TrendingUp, Package, Users, DollarSign, Download, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { utils, writeFile } from 'xlsx';
import { generateSalesReportPDF, downloadPDF } from '@/utils/pdfGenerator';

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [salesData, setSalesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sales: 0, products: 0, customers: 0, avgTicket: 0 });

  useEffect(() => {
    if (period === 'month') {
      setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    } else if (period === 'last3months') {
      setStartDate(format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [user, startDate, endDate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch sales
    const { data: sales } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    // Fetch products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id);

    // Fetch customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id);

    if (sales) {
      // Process sales by day
      const salesByDay: Record<string, number> = {};
      const salesByPayment: Record<string, number> = {};
      
      sales.forEach(s => {
        const day = format(new Date(s.created_at), 'dd/MM');
        salesByDay[day] = (salesByDay[day] || 0) + Number(s.total);
        salesByPayment[s.payment_method] = (salesByPayment[s.payment_method] || 0) + Number(s.total);
      });

      setSalesData([
        { chart: 'byDay', data: Object.entries(salesByDay).map(([name, value]) => ({ name, value })) },
        { chart: 'byPayment', data: Object.entries(salesByPayment).map(([name, value]) => ({ name: name === 'money' ? 'Dinheiro' : name === 'card' ? 'Cartão' : 'PIX', value })) }
      ]);

      setTotals(prev => ({
        ...prev,
        sales: sales.reduce((a, s) => a + Number(s.total), 0),
        avgTicket: sales.length > 0 ? sales.reduce((a, s) => a + Number(s.total), 0) / sales.length : 0
      }));
    }

    if (products) {
      // Top products by stock value
      const topProducts = products
        .map(p => ({ name: p.name.substring(0, 15), value: p.stock_quantity * Number(p.sale_price) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      setProductsData(topProducts);
      setTotals(prev => ({ ...prev, products: products.length }));
    }

    if (customers) {
      // Top customers by purchases
      const topCustomers = customers
        .map(c => ({ name: c.name.substring(0, 15), value: Number(c.total_purchases) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      setCustomersData(topCustomers);
      setTotals(prev => ({ ...prev, customers: customers.length }));
    }
  };

  const exportSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*, sale_items(*), customers(name)')
      .eq('user_id', user?.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (!data) return;

    const exportData = data.map(s => ({
      'Data': format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
      'Cliente': s.customers?.name || 'Consumidor Final',
      'Pagamento': s.payment_method === 'money' ? 'Dinheiro' : s.payment_method === 'card' ? 'Cartão' : 'PIX',
      'Itens': s.sale_items.length,
      'Desconto': s.discount,
      'Total': s.total
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Vendas');
    writeFile(wb, `vendas_${startDate}_${endDate}.xlsx`);
    toast({ title: 'Relatório exportado!' });
  };

  const exportProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('user_id', user?.id);

    if (!data) return;

    const exportData = data.map(p => ({
      'Código': p.barcode || '',
      'Produto': p.name,
      'Categoria': p.categories?.name || '',
      'Estoque': p.stock_quantity,
      'Estoque Mín': p.min_stock,
      'Custo': p.cost_price,
      'Venda': p.sale_price,
      'NCM': p.ncm_code,
      'Status': p.is_active ? 'Ativo' : 'Inativo'
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Produtos');
    writeFile(wb, `produtos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Produtos exportados!' });
  };

  const exportCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user?.id);

    if (!data) return;

    const exportData = data.map(c => ({
      'Nome': c.name,
      'Email': c.email || '',
      'Telefone': c.phone || '',
      'CPF': c.cpf || '',
      'Endereço': c.address || '',
      'Total Compras': c.total_purchases,
      'Pontos': c.loyalty_points,
      'Desde': format(new Date(c.created_at), 'dd/MM/yyyy')
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Clientes');
    writeFile(wb, `clientes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Clientes exportados!' });
  };

  const COLORS = ['hsl(var(--primary))', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análises e métricas do negócio</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="last3months">Últimos 3 Meses</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold">R$ {totals.sales.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">R$ {totals.avgTicket.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Produtos</p>
                  <p className="text-2xl font-bold">{totals.products}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{totals.customers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
            <TabsTrigger value="export">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Vendas por Dia</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.find(s => s.chart === 'byDay')?.data || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Por Forma de Pagamento</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={salesData.find(s => s.chart === 'byPayment')?.data || []}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {(salesData.find(s => s.chart === 'byPayment')?.data || []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader><CardTitle>Top 10 Produtos por Valor em Estoque</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader><CardTitle>Top 10 Clientes por Valor de Compras</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customersData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader><CardTitle>Exportar Dados</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Exporte seus dados para planilhas Excel ou PDF.</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button onClick={exportSales} variant="outline" className="h-24 flex-col">
                    <FileSpreadsheet className="h-8 w-8 mb-2" />
                    Vendas (Excel)
                  </Button>
                  <Button onClick={async () => {
                    const { data } = await supabase
                      .from('sales')
                      .select('*, sale_items(*)')
                      .eq('user_id', user?.id)
                      .gte('created_at', startDate)
                      .lte('created_at', endDate + 'T23:59:59');
                    if (data) {
                      const salesForPdf = data.map(s => ({
                        id: s.id,
                        created_at: s.created_at,
                        total: s.total,
                        payment_method: s.payment_method,
                        items: s.sale_items.map((item: any) => ({
                          product_name: item.product_name,
                          quantity: item.quantity,
                          total_price: item.total_price
                        }))
                      }));
                      const doc = generateSalesReportPDF(salesForPdf);
                      downloadPDF(doc, `vendas_${startDate}_${endDate}.pdf`);
                      toast({ title: 'PDF gerado com sucesso!' });
                    }
                  }} variant="outline" className="h-24 flex-col">
                    <FileText className="h-8 w-8 mb-2" />
                    Vendas (PDF)
                  </Button>
                  <Button onClick={exportProducts} variant="outline" className="h-24 flex-col">
                    <Package className="h-8 w-8 mb-2" />
                    Produtos (Excel)
                  </Button>
                  <Button onClick={exportCustomers} variant="outline" className="h-24 flex-col">
                    <Users className="h-8 w-8 mb-2" />
                    Clientes (Excel)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
