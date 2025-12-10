import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Product, Category } from '@/types/database';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Products() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    description: '',
    category_id: '',
    cost_price: '',
    sale_price: '',
    stock_quantity: '',
    min_stock: '5',
    unit: 'un',
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCategories();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('name');
    if (data) setProducts(data as Product[]);
  };

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setCategories(data as Category[]);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        barcode: product.barcode || '',
        description: product.description || '',
        category_id: product.category_id || '',
        cost_price: String(product.cost_price),
        sale_price: String(product.sale_price),
        stock_quantity: String(product.stock_quantity),
        min_stock: String(product.min_stock),
        unit: product.unit,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        barcode: '',
        description: '',
        category_id: '',
        cost_price: '',
        sale_price: '',
        stock_quantity: '0',
        min_stock: '5',
        unit: 'un',
      });
    }
    setShowProductDialog(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.sale_price) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    const productData = {
      user_id: user!.id,
      name: productForm.name,
      barcode: productForm.barcode || null,
      description: productForm.description || null,
      category_id: productForm.category_id || null,
      cost_price: Number(productForm.cost_price) || 0,
      sale_price: Number(productForm.sale_price),
      stock_quantity: Number(productForm.stock_quantity) || 0,
      min_stock: Number(productForm.min_stock) || 5,
      unit: productForm.unit,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast({ title: 'Produto criado com sucesso!' });
      }
      
      setShowProductDialog(false);
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar produto', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir produto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído com sucesso!' });
      fetchProducts();
    }
  };

  const saveCategory = async () => {
    if (!categoryForm.name) {
      toast({ title: 'Nome da categoria é obrigatório', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('categories')
      .insert({ user_id: user!.id, ...categoryForm });
    
    if (error) {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria criada com sucesso!' });
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      fetchCategories();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCategoryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
            <Button onClick={() => openProductDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
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
                            {product.barcode && (
                              <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(product.cost_price))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(Number(product.sale_price))}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {product.stock_quantity <= product.min_stock && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <span className={cn(
                            "font-mono",
                            product.stock_quantity <= 0 && "text-destructive font-bold",
                            product.stock_quantity > 0 && product.stock_quantity <= product.min_stock && "text-warning font-medium"
                          )}>
                            {product.stock_quantity} {product.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openProductDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteProduct(product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  placeholder="Ex: 7891234567890"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={productForm.category_id || "none"}
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Preço de Custo</Label>
                <Input
                  type="number"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Preço de Venda *</Label>
                <Input
                  type="number"
                  value={productForm.sale_price}
                  onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input
                  type="number"
                  value={productForm.min_stock}
                  onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                  placeholder="5"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={productForm.unit}
                  onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="l">Litro</SelectItem>
                    <SelectItem value="cx">Caixa</SelectItem>
                    <SelectItem value="pc">Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveProduct} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Nome da categoria"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}