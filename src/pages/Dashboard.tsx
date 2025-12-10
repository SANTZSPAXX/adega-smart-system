import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = ['hsl(173, 80%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(262, 83%, 58%)', 'hsl(0, 84%, 60%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    salesCount: 0,
    avgTicket: 0,
    todaySalesCount: 0,
  });
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [salesByHour, setSalesByHour] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .eq('status', 'completed');

      // Fetch month sales
      const { data: monthSalesData } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', startOfMonth)
        .eq('status', 'completed');

      // Fetch products count and low stock
      const { data: productsData } = await supabase
        .from('products')
        .select('stock_quantity, min_stock');

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch sales count
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Calculate stats
      const todayTotal = todaySalesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const monthTotal = monthSalesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const totalProducts = productsData?.length || 0;
      const lowStock = productsData?.filter(p => p.stock_quantity <= p.min_stock).length || 0;
      const todaySalesCount = todaySalesData?.length || 0;
      const avgTicket = todaySalesCount > 0 ? todayTotal / todaySalesCount : 0;

      setStats({
        todaySales: todayTotal,
        monthSales: monthTotal,
        totalProducts,
        lowStockProducts: lowStock,
        totalCustomers: customersCount || 0,
        salesCount: salesCount || 0,
        avgTicket,
        todaySalesCount,
      });

      // Fetch sales by day (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();
        
        const { data: daySales } = await supabase
          .from('sales')
          .select('total')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .eq('status', 'completed');

        last7Days.push({
          day: format(date, 'EEE', { locale: ptBR }),
          date: format(date, 'dd/MM'),
          vendas: daySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0,
          quantidade: daySales?.length || 0,
        });
      }
      setSalesByDay(last7Days);

      // Fetch sales by hour (last 24 hours)
      const salesHourly = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = subHours(today, i);
        const hourEnd = subHours(today, i - 1);
        
        const { data: hourSales } = await supabase
          .from('sales')
          .select('total')
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString())
          .eq('status', 'completed');

        salesHourly.push({
          hora: format(hourStart, 'HH:00'),
          vendas: hourSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0,
        });
      }
      setSalesByHour(salesHourly);

      // Fetch recent sales
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentSales(recentSalesData || []);

      // Fetch top selling products
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('product_name, quantity, total_price');

      if (saleItems) {
        const productSales: Record<string, { quantity: number; total: number }> = {};
        saleItems.forEach(item => {
          if (!productSales[item.product_name]) {
            productSales[item.product_name] = { quantity: 0, total: 0 };
          }
          productSales[item.product_name].quantity += item.quantity;
          productSales[item.product_name].total += Number(item.total_price);
        });

        const sorted = Object.entries(productSales)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 5)
          .map(([name, data]) => ({ name: name.substring(0, 15), vendas: data.total, quantidade: data.quantity }));
        
        setTopProducts(sorted);
      }

      // Fetch payment methods distribution
      const { data: salesByMethod } = await supabase
        .from('sales')
        .select('payment_method, total')
        .eq('status', 'completed');

      if (salesByMethod) {
        const methods: Record<string, number> = {};
        salesByMethod.forEach(sale => {
          const method = sale.payment_method || 'Outros';
          methods[method] = (methods[method] || 0) + Number(sale.total);
        });

        const methodLabels: Record<string, string> = {
          dinheiro: 'Dinheiro',
          cartao_credito: 'Crédito',
          cartao_debito: 'Débito',
          pix: 'PIX',
        };

        setPaymentMethods(
          Object.entries(methods).map(([name, value]) => ({
            name: methodLabels[name] || name,
            value,
          }))
        );
      }

      setLastUpdate(new Date());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Auto-refresh every 3 minutes (180000ms)
      const interval = setInterval(fetchDashboardData, 180000);
      return () => clearInterval(interval);
    }
  }, [user, fetchDashboardData]);

  // Real-time subscription for new sales
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral em tempo real</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Atualizado: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })} • Próxima atualização em 3 min
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <StatCard
            title="Vendas Hoje"
            value={formatCurrency(stats.todaySales)}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Vendas do Mês"
            value={formatCurrency(stats.monthSales)}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Vendas Hoje"
            value={stats.todaySalesCount}
            icon={ShoppingCart}
            variant="default"
          />
          <StatCard
            title="Ticket Médio"
            value={formatCurrency(stats.avgTicket)}
            icon={TrendingUp}
            variant="default"
          />
          <StatCard
            title="Total Vendas"
            value={stats.salesCount}
            icon={ShoppingCart}
            variant="default"
          />
          <StatCard
            title="Produtos"
            value={stats.totalProducts}
            icon={Package}
            variant="default"
          />
          <StatCard
            title="Estoque Baixo"
            value={stats.lowStockProducts}
            icon={AlertTriangle}
            variant={stats.lowStockProducts > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Clientes"
            value={stats.totalCustomers}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Day Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas - Últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesByDay}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                    />
                    <Area type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sales by Hour Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas por Hora (Últimas 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                    />
                    <Line type="monotone" dataKey="vendas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentMethods.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Total']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma venda registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Products Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'vendas' ? formatCurrency(value) : value,
                          name === 'vendas' ? 'Total' : 'Qtd'
                        ]}
                      />
                      <Bar dataKey="vendas" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhuma venda registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Venda #{sale.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(sale.created_at), "dd/MM HH:mm", { locale: ptBR })} • {sale.payment_method}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">{formatCurrency(sale.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
