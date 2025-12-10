import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Product, Customer, CartItem } from '@/types/database';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard, Banknote, Smartphone, X, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PDV() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCustomers();
    }
    searchRef.current?.focus();
  }, [user]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data as Product[]);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (data) setCustomers(data as Customer[]);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast({ title: 'Produto sem estoque', variant: 'destructive' });
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({ title: 'Estoque insuficiente', variant: 'destructive' });
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stock_quantity) {
          toast({ title: 'Estoque insuficiente', variant: 'destructive' });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.sale_price) * item.quantity), 0);
  const total = subtotal - discount;
  const change = Number(amountReceived) - total;

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user!.id,
          customer_id: selectedCustomer?.id || null,
          total,
          discount,
          payment_method: paymentMethod,
          status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: Number(item.product.sale_price) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of cart) {
        const newStock = item.product.stock_quantity - item.quantity;
        
        await supabase
          .from('stock_movements')
          .insert({
            user_id: user!.id,
            product_id: item.product.id,
            movement_type: 'saida',
            quantity: item.quantity,
            previous_stock: item.product.stock_quantity,
            new_stock: newStock,
            reason: `Venda #${sale.id.substring(0, 8)}`,
          });
      }

      // Update customer loyalty
      if (selectedCustomer) {
        await supabase
          .from('customers')
          .update({
            loyalty_points: selectedCustomer.loyalty_points + Math.floor(total / 10),
            total_purchases: Number(selectedCustomer.total_purchases) + total,
          })
          .eq('id', selectedCustomer.id);
      }

      toast({ title: 'Venda realizada com sucesso!' });
      setShowPaymentDialog(false);
      clearCart();
      fetchProducts();
      
    } catch (error: any) {
      toast({ title: 'Erro ao processar venda', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculatorButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', 'C'];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Products Section */}
        <div className="flex-1 flex flex-col p-4">
          {/* Search */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Buscar produto ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity <= 0}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:border-primary/50",
                    product.stock_quantity <= 0
                      ? "bg-muted opacity-60 cursor-not-allowed"
                      : "bg-card hover:bg-secondary/50"
                  )}
                >
                  <p className="font-medium text-sm text-foreground line-clamp-2 mb-2">{product.name}</p>
                  <p className="text-lg font-bold text-primary font-mono">{formatCurrency(Number(product.sale_price))}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    product.stock_quantity <= product.min_stock ? "text-destructive" : "text-muted-foreground"
                  )}>
                    Estoque: {product.stock_quantity} {product.unit}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Carrinho</h2>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Customer Select */}
            <Select
              value={selectedCustomer?.id || ''}
              onValueChange={(value) => setSelectedCustomer(customers.find(c => c.id === value) || null)}
            >
              <SelectTrigger className="w-full">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem cliente</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Carrinho vazio</p>
                <p className="text-sm">Adicione produtos para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatCurrency(Number(item.product.sale_price))} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-bold text-sm w-20 text-right font-mono">
                      {formatCurrency(Number(item.product.sale_price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Total */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Desconto:</span>
              <Input
                type="number"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-24 h-8 text-sm"
                placeholder="R$ 0,00"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Desconto:</span>
                  <span className="font-mono">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
                <span>Total:</span>
                <span className="text-primary font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              variant="sale"
              size="xl"
              className="w-full"
              disabled={cart.length === 0}
              onClick={() => setShowPaymentDialog(true)}
            >
              <CreditCard className="h-5 w-5" />
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar Pagamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-4xl font-bold text-primary font-mono">{formatCurrency(total)}</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Button
                variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('dinheiro')}
                className="flex-col h-auto py-3"
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs">Dinheiro</span>
              </Button>
              <Button
                variant={paymentMethod === 'cartao_credito' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cartao_credito')}
                className="flex-col h-auto py-3"
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs">Crédito</span>
              </Button>
              <Button
                variant={paymentMethod === 'cartao_debito' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cartao_debito')}
                className="flex-col h-auto py-3"
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs">Débito</span>
              </Button>
              <Button
                variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('pix')}
                className="flex-col h-auto py-3"
              >
                <Smartphone className="h-5 w-5 mb-1" />
                <span className="text-xs">PIX</span>
              </Button>
            </div>

            {paymentMethod === 'dinheiro' && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Valor recebido:</p>
                  <Input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="text-2xl h-14 font-mono text-center"
                    placeholder="0,00"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {calculatorButtons.map((btn) => (
                    <Button
                      key={btn}
                      variant="outline"
                      onClick={() => {
                        if (btn === 'C') {
                          setAmountReceived('');
                        } else {
                          setAmountReceived(prev => prev + btn);
                        }
                      }}
                      className="h-12 text-lg font-mono"
                    >
                      {btn}
                    </Button>
                  ))}
                </div>

                {Number(amountReceived) >= total && (
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Troco</p>
                    <p className="text-2xl font-bold text-success font-mono">{formatCurrency(change)}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="sale"
              onClick={handlePayment}
              disabled={loading || (paymentMethod === 'dinheiro' && Number(amountReceived) < total)}
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
