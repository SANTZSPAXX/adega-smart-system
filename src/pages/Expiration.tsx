import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Package, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductWithExpiration {
  id: string;
  name: string;
  barcode: string | null;
  stock_quantity: number;
  unit: string;
  expiration_date: string | null;
  category?: { name: string } | null;
}

type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'safe' | 'no_date';

export default function Expiration() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithExpiration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('products')
      .select('id, name, barcode, stock_quantity, unit, expiration_date, category:categories(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('expiration_date', { ascending: true, nullsFirst: false });
    
    if (data) setProducts(data as ProductWithExpiration[]);
    setLoading(false);
  };

  const getExpirationStatus = (expirationDate: string | null): ExpirationStatus => {
    if (!expirationDate) return 'no_date';
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = differenceInDays(expDate, today);
    
    if (daysUntilExpiration < 0) return 'expired';
    if (daysUntilExpiration <= 14) return 'critical'; // 2 weeks - yellow
    if (daysUntilExpiration <= 35) return 'warning'; // 5 weeks - orange
    return 'safe'; // more than 5 weeks - green
  };

  const getStatusConfig = (status: ExpirationStatus) => {
    switch (status) {
      case 'expired':
        return {
          label: 'Vencido',
          color: 'bg-destructive text-destructive-foreground',
          rowClass: 'bg-destructive/10 hover:bg-destructive/20',
          icon: XCircle,
          textColor: 'text-destructive'
        };
      case 'critical':
        return {
          label: 'Crítico (< 2 sem)',
          color: 'bg-yellow-500 text-white',
          rowClass: 'bg-yellow-500/10 hover:bg-yellow-500/20',
          icon: AlertTriangle,
          textColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'warning':
        return {
          label: 'Atenção (< 5 sem)',
          color: 'bg-orange-500 text-white',
          rowClass: 'bg-orange-500/10 hover:bg-orange-500/20',
          icon: Clock,
          textColor: 'text-orange-600 dark:text-orange-400'
        };
      case 'safe':
        return {
          label: 'OK (> 5 sem)',
          color: 'bg-green-500 text-white',
          rowClass: 'hover:bg-muted/50',
          icon: CheckCircle,
          textColor: 'text-green-600 dark:text-green-400'
        };
      case 'no_date':
        return {
          label: 'Sem data',
          color: 'bg-muted text-muted-foreground',
          rowClass: 'hover:bg-muted/50',
          icon: Package,
          textColor: 'text-muted-foreground'
        };
    }
  };

  const groupedProducts = useMemo(() => {
    const expired: ProductWithExpiration[] = [];
    const critical: ProductWithExpiration[] = [];
    const warning: ProductWithExpiration[] = [];
    const safe: ProductWithExpiration[] = [];
    const noDate: ProductWithExpiration[] = [];

    products.forEach(product => {
      const status = getExpirationStatus(product.expiration_date);
      switch (status) {
        case 'expired': expired.push(product); break;
        case 'critical': critical.push(product); break;
        case 'warning': warning.push(product); break;
        case 'safe': safe.push(product); break;
        case 'no_date': noDate.push(product); break;
      }
    });

    return { expired, critical, warning, safe, noDate };
  }, [products]);

  const stats = useMemo(() => ({
    expired: groupedProducts.expired.length,
    critical: groupedProducts.critical.length,
    warning: groupedProducts.warning.length,
    safe: groupedProducts.safe.length,
    noDate: groupedProducts.noDate.length,
    total: products.length
  }), [groupedProducts, products]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getDaysText = (expirationDate: string | null) => {
    if (!expirationDate) return '';
    const days = differenceInDays(new Date(expirationDate), new Date());
    if (days < 0) return `${Math.abs(days)} dias atrás`;
    if (days === 0) return 'Hoje';
    if (days === 1) return '1 dia';
    return `${days} dias`;
  };

  const renderProductTable = (productList: ProductWithExpiration[], title: string, status: ExpirationStatus) => {
    if (productList.length === 0) return null;
    
    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.textColor)} />
            <span>{title}</span>
            <Badge className={config.color}>{productList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productList.map((product) => (
                <TableRow key={product.id} className={config.rowClass}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.barcode && (
                          <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category?.name || '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {product.stock_quantity} {product.unit}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn("font-medium", config.textColor)}>
                      {formatDate(product.expiration_date)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn("font-medium", config.textColor)}>
                      {getDaysText(product.expiration_date)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle de Vencimento</h1>
            <p className="text-muted-foreground">Acompanhe os produtos próximos ao vencimento</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Vencidos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">{"< 2 semanas"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.warning}</p>
                <p className="text-sm text-muted-foreground">{"< 5 semanas"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.safe}</p>
                <p className="text-sm text-muted-foreground">{"> 5 semanas"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.noDate}</p>
                <p className="text-sm text-muted-foreground">Sem data</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Tables */}
        <ScrollArea className="h-[calc(100vh-380px)]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {renderProductTable(groupedProducts.expired, 'Produtos Vencidos', 'expired')}
              {renderProductTable(groupedProducts.critical, 'Vencimento Crítico (menos de 2 semanas)', 'critical')}
              {renderProductTable(groupedProducts.warning, 'Atenção (menos de 5 semanas)', 'warning')}
              {renderProductTable(groupedProducts.safe, 'OK (mais de 5 semanas)', 'safe')}
              {renderProductTable(groupedProducts.noDate, 'Produtos sem Data de Vencimento', 'no_date')}
              
              {products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto com estoque encontrado
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
