import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Product, StockMovement } from '@/types/database';
import { Plus, Minus, ArrowUpDown, Package, TrendingUp, TrendingDown, Search, Barcode, FileText, Trash2 } from 'lucide-react';
import { generateStockPDF, downloadPDF } from '@/utils/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

export default function Stock() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [loading, setLoading] = useState(false);
  const lastDataHash = useRef<string>('');
  
  const [movementForm, setMovementForm] = useState({
    product_id: '',
    quantity: '',
    reason: '',
  });

  const [quickAddForm, setQuickAddForm] = useState({
    barcode: '',
    quantity: '',
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchMovements();
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('stock-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchProducts(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_movements' },
        () => fetchMovements(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async (silent = false) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (data) {
      const hash = JSON.stringify(data.map(p => p.id + p.stock_quantity));
      if (hash !== lastDataHash.current || !silent) {
        lastDataHash.current = hash;
        setProducts(data as Product[]);
      }
    }
  };

  const fetchMovements = async (silent = false) => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*, product:products(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data && !silent) setMovements(data as StockMovement[]);
  };

  const deleteStockMovement = async (productId: string) => {
    if (!confirm('Tem certeza que deseja zerar o estoque deste produto?')) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
      // Create a stock adjustment to zero
      await supabase
        .from('stock_movements')
        .insert({
          user_id: user!.id,
          product_id: productId,
          movement_type: 'ajuste',
          quantity: product.stock_quantity,
          previous_stock: product.stock_quantity,
          new_stock: 0,
          reason: 'Estoque zerado manualmente',
        });
      
      toast({ title: 'Estoque zerado com sucesso!' });
      fetchProducts();
      fetchMovements();
    } catch (error: any) {
      toast({ title: 'Erro ao zerar estoque', description: error.message, variant: 'destructive' });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock);

  const handlePrintStock = () => {
    const doc = generateStockPDF(products);
    downloadPDF(doc, `estoque_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
    toast({ title: 'PDF gerado com sucesso!' });
  };

  const openMovementDialog = (type: 'entrada' | 'saida', productId?: string) => {
    setMovementType(type);
    setMovementForm({
      product_id: productId || '',
      quantity: '',
      reason: '',
    });
    setShowMovementDialog(true);
  };

  const saveMovement = async () => {
    if (!movementForm.product_id || !movementForm.quantity) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const product = products.find(p => p.id === movementForm.product_id);
    if (!product) return;

    const quantity = Number(movementForm.quantity);
    const previousStock = product.stock_quantity;
    const newStock = movementType === 'entrada' 
      ? previousStock + quantity 
      : previousStock - quantity;

    if (newStock < 0) {
      toast({ title: 'Estoque insuficiente para esta saída', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          user_id: user!.id,
          product_id: movementForm.product_id,
          movement_type: movementType,
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: movementForm.reason || null,
        });

      if (error) throw error;

      toast({ title: `${movementType === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!` });
      setShowMovementDialog(false);
      fetchProducts();
      fetchMovements();
    } catch (error: any) {
      toast({ title: 'Erro ao registrar movimentação', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Quick add by EAN/barcode
  const handleQuickAdd = async () => {
    if (!quickAddForm.barcode || !quickAddForm.quantity) {
      toast({ title: 'Preencha o código de barras e quantidade', variant: 'destructive' });
      return;
    }

    const product = products.find(p => p.barcode === quickAddForm.barcode);
    
    if (!product) {
      toast({ title: 'Produto não encontrado', description: 'Nenhum produto com este código de barras', variant: 'destructive' });
      return;
    }

    const quantity = Number(quickAddForm.quantity);
    const previousStock = product.stock_quantity;
    const newStock = previousStock + quantity;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('stock_movements')
        .insert({
          user_id: user!.id,
          product_id: product.id,
          movement_type: 'entrada',
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: 'Entrada rápida por código de barras',
        });

      if (error) throw error;

      toast({ 
        title: 'Entrada registrada!', 
        description: `${product.name}: +${quantity} unidades` 
      });
      setQuickAddForm({ barcode: '', quantity: '' });
      setShowQuickAddDialog(false);
      fetchProducts();
      fetchMovements();
    } catch (error: any) {
      toast({ title: 'Erro ao registrar entrada', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
            <p className="text-muted-foreground">Gerencie entradas e saídas de produtos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintStock}>
              <FileText className="h-4 w-4 mr-2" />
              Imprimir Estoque
            </Button>
            <Button variant="outline" onClick={() => setShowQuickAddDialog(true)}>
              <Barcode className="h-4 w-4 mr-2" />
              Entrada por EAN
            </Button>
            <Button variant="outline" onClick={() => openMovementDialog('saida')}>
              <Minus className="h-4 w-4 mr-2" />
              Saída
            </Button>
            <Button onClick={() => openMovementDialog('entrada')}>
              <Plus className="h-4 w-4 mr-2" />
              Entrada
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Produtos ({products.length})
            </TabsTrigger>
            <TabsTrigger value="low-stock">
              <TrendingDown className="h-4 w-4 mr-2" />
              Estoque Baixo ({lowStockProducts.length})
            </TabsTrigger>
            <TabsTrigger value="movements">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Movimentações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-360px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="text-center">Estoque Atual</TableHead>
                        <TableHead className="text-center">Mínimo</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id} className="table-row-hover">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.unit}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-muted-foreground">
                              {product.barcode || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-mono text-lg font-bold",
                              product.stock_quantity <= 0 && "text-destructive",
                              product.stock_quantity > 0 && product.stock_quantity <= product.min_stock && "text-warning"
                            )}>
                              {product.stock_quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {product.min_stock}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.stock_quantity <= 0 ? (
                              <Badge variant="destructive">Sem estoque</Badge>
                            ) : product.stock_quantity <= product.min_stock ? (
                              <Badge className="badge-warning">Baixo</Badge>
                            ) : (
                              <Badge className="badge-success">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMovementDialog('entrada', product.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Entrada
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMovementDialog('saida', product.id)}
                                disabled={product.stock_quantity <= 0}
                              >
                                <Minus className="h-4 w-4 mr-1" />
                                Saída
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteStockMovement(product.id)}
                                title="Zerar estoque"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  {lowStockProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum produto com estoque baixo</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Estoque Atual</TableHead>
                          <TableHead className="text-center">Mínimo</TableHead>
                          <TableHead className="text-center">Faltando</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowStockProducts.map((product) => (
                          <TableRow key={product.id} className="table-row-hover">
                            <TableCell>
                              <p className="font-medium">{product.name}</p>
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-destructive">
                              {product.stock_quantity}
                            </TableCell>
                            <TableCell className="text-center font-mono text-muted-foreground">
                              {product.min_stock}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium text-warning">
                              {product.min_stock - product.stock_quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => openMovementDialog('entrada', product.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Repor
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-center">Antes</TableHead>
                        <TableHead className="text-center">Depois</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id} className="table-row-hover">
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(movement.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(movement as any).product?.name || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {movement.movement_type === 'entrada' ? (
                              <Badge className="badge-success">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Entrada
                              </Badge>
                            ) : movement.movement_type === 'saida' ? (
                              <Badge className="badge-destructive">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Saída
                              </Badge>
                            ) : (
                              <Badge className="badge-warning">Ajuste</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            {movement.movement_type === 'entrada' ? '+' : '-'}{movement.quantity}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {movement.previous_stock}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {movement.new_stock}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {movement.reason || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma movimentação registrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Movement Dialog */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'entrada' ? '📥 Entrada de Estoque' : '📤 Saída de Estoque'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={movementForm.product_id}
                onValueChange={(value) => setMovementForm({ ...movementForm, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.stock_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="0"
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={movementForm.reason}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                placeholder="Ex: Reposição de estoque, Venda avulsa..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMovement} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add by EAN Dialog */}
      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Entrada Rápida por Código de Barras
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código de Barras (EAN) *</Label>
              <Input
                value={quickAddForm.barcode}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, barcode: e.target.value })}
                placeholder="Escaneie ou digite o código"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={quickAddForm.quantity}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, quantity: e.target.value })}
                placeholder="0"
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAdd} disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar Entrada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
