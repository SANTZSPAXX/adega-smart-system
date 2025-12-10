import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Product, Customer, CartItem } from '@/types/database';
import { generateReceiptPDF, downloadPDF, printPDF } from '@/utils/pdfGenerator';
import { OfflineIndicator } from '@/components/pdv/OfflineIndicator';
import { QuickActions } from '@/components/pdv/QuickActions';
import { SalesHistory } from '@/components/pdv/SalesHistory';
import { CalculatorDialog } from '@/components/pdv/CalculatorDialog';
import { ChangeCalculatorDialog } from '@/components/pdv/ChangeCalculatorDialog';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  X, 
  Printer,
  FileText,
  CheckCircle2,
  MessageCircle,
  Phone,
  Barcode,
  Tag,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import techcontrolLogo from '@/assets/techcontrol-logo.png';

const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511956614601";

interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase: number;
  max_discount: number | null;
  is_active: boolean;
}

export default function PDV() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  
  const {
    isOnline,
    pendingSalesCount,
    lastSync,
    cachedProducts,
    cachedCustomers,
    cacheProducts,
    cacheCustomers,
    updateLastSync,
    addPendingSale,
    pendingSales,
    removePendingSale,
  } = useOfflineMode();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [enableChange, setEnableChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [pixKey, setPixKey] = useState('');
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);
  
  // Cash registers
  const [openRegisters, setOpenRegisters] = useState<Array<{id: string; register_name: string; operator_name: string | null}>>([]);
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);
  
  // Dialogs
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [showChangeCalculatorDialog, setShowChangeCalculatorDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showQuickProductDialog, setShowQuickProductDialog] = useState(false);
  const [discountType, setDiscountType] = useState<'value' | 'percent'>('value');
  const [discountInput, setDiscountInput] = useState('');
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState('');

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCustomers();
      fetchPixKey();
      fetchActiveDiscounts();
      fetchOpenRegisters();
    } else if (cachedProducts.length > 0) {
      setProducts(cachedProducts);
      setCustomers(cachedCustomers);
    }
    searchRef.current?.focus();
  }, [user]);

  // Fetch open registers periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchOpenRegisters();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Apply automatic discount when cart changes
  useEffect(() => {
    applyAutomaticDiscount();
  }, [cart, activeDiscounts]);

  // Sync pending sales when online
  useEffect(() => {
    if (isOnline && pendingSalesCount > 0) {
      syncPendingSales();
    }
  }, [isOnline]);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');
    if (data) {
      setProducts(data as Product[]);
      cacheProducts(data as Product[]);
      updateLastSync();
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) {
      setCustomers(data as Customer[]);
      cacheCustomers(data as Customer[]);
    }
  };

  const fetchPixKey = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('company_settings')
      .select('pix_key')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data && (data as any).pix_key) {
      setPixKey((data as any).pix_key);
    }
  };

  const fetchActiveDiscounts = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gte.${now}`);
    
    if (data) {
      setActiveDiscounts(data as Discount[]);
    }
  };

  const fetchOpenRegisters = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cash_register')
      .select('id, register_name, operator_name')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    
    if (data && data.length > 0) {
      setOpenRegisters(data);
      // Auto-select first register if none selected
      if (!selectedRegister) {
        setSelectedRegister(data[0].id);
      }
    } else {
      setOpenRegisters([]);
      setSelectedRegister(null);
    }
  };

  const applyAutomaticDiscount = () => {
    if (cart.length === 0 || activeDiscounts.length === 0) {
      if (appliedDiscount) {
        setDiscount(0);
        setAppliedDiscount(null);
      }
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.sale_price) * item.quantity), 0);
    
    // Find best applicable discount
    let bestDiscount: Discount | null = null;
    let bestDiscountValue = 0;

    for (const d of activeDiscounts) {
      if (subtotal >= d.min_purchase) {
        let discountValue = 0;
        if (d.type === 'percentage') {
          discountValue = (subtotal * d.value) / 100;
          if (d.max_discount && discountValue > d.max_discount) {
            discountValue = d.max_discount;
          }
        } else {
          discountValue = d.value;
        }

        if (discountValue > bestDiscountValue) {
          bestDiscountValue = discountValue;
          bestDiscount = d;
        }
      }
    }

    if (bestDiscount && bestDiscountValue > 0) {
      setDiscount(bestDiscountValue);
      setAppliedDiscount(bestDiscount);
      if (!appliedDiscount || appliedDiscount.id !== bestDiscount.id) {
        toast({ title: `Desconto "${bestDiscount.name}" aplicado automaticamente!` });
      }
    } else if (appliedDiscount) {
      setDiscount(0);
      setAppliedDiscount(null);
    }
  };

  const syncPendingSales = async () => {
    if (syncing || !isOnline || pendingSales.length === 0) return;

    setSyncing(true);
    try {
      for (const pendingSale of pendingSales) {
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            user_id: user!.id,
            customer_id: pendingSale.customer?.id || null,
            total: pendingSale.total,
            discount: pendingSale.discount,
            payment_method: pendingSale.paymentMethod,
            status: 'completed',
          })
          .select()
          .single();

        if (saleError) throw saleError;

        const saleItems = pendingSale.cart.map(item => ({
          sale_id: sale.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          total_price: Number(item.product.sale_price) * item.quantity,
        }));

        await supabase.from('sale_items').insert(saleItems);

        for (const item of pendingSale.cart) {
          const newStock = item.product.stock_quantity - item.quantity;
          await supabase.from('stock_movements').insert({
            user_id: user!.id,
            product_id: item.product.id,
            movement_type: 'saida',
            quantity: item.quantity,
            previous_stock: item.product.stock_quantity,
            new_stock: newStock,
            reason: `Venda offline #${pendingSale.id.substring(0, 8)}`,
          });
        }

        removePendingSale(pendingSale.id);
      }

      toast({ title: 'Vendas sincronizadas com sucesso!' });
      fetchProducts();
    } catch (error: any) {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
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

  const addQuickProduct = () => {
    if (!quickProductName || !quickProductPrice) return;

    const quickProduct: Product = {
      id: `quick_${Date.now()}`,
      name: quickProductName,
      sale_price: Number(quickProductPrice),
      stock_quantity: 999,
      min_stock: 0,
      is_active: true,
      user_id: user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: null,
      barcode: null,
      description: null,
      cost_price: 0,
      unit: 'un',
      ncm_code: null,
      cest_code: null,
      cfop: null,
      image_url: null,
      profit_margin_percent: null,
      profit_margin_value: null,
      expiration_date: null,
    };

    setCart([...cart, { product: quickProduct, quantity: 1 }]);
    setQuickProductName('');
    setQuickProductPrice('');
    setShowQuickProductDialog(false);
    toast({ title: 'Produto adicionado!' });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (!item.product.id.startsWith('quick_') && newQty > item.product.stock_quantity) {
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
    setAppliedDiscount(null);
    setSearchTerm('');
    searchRef.current?.focus();
  };

  const applyManualDiscount = () => {
    const value = Number(discountInput);
    if (discountType === 'percent') {
      setDiscount((subtotal * value) / 100);
    } else {
      setDiscount(value);
    }
    setAppliedDiscount(null);
    setShowDiscountDialog(false);
    setDiscountInput('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.product.sale_price) * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const cashOrPixAmount = Number(amountReceived) || 0;
  const cardAmountValue = Number(cardAmount) || 0;
  const totalReceived = paymentMethod === 'dinheiro_cartao' || paymentMethod === 'pix_cartao' 
    ? cashOrPixAmount + cardAmountValue 
    : cashOrPixAmount;
  const change = totalReceived - total;

  // Generate PIX payload (simplified static QR code)
  const generatePixPayload = () => {
    if (!pixKey) return '';
    return `PIX:${pixKey}|VALOR:${total.toFixed(2)}`;
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Offline mode
      if (!isOnline) {
        const offlineSale = addPendingSale({
          cart,
          customer: selectedCustomer,
          discount,
          paymentMethod,
          total,
        });
        
        setLastSale({
          id: offlineSale.id,
          items: cart.map(item => ({
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.sale_price,
            total_price: Number(item.product.sale_price) * item.quantity,
          })),
          total,
          discount,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          customer_name: selectedCustomer?.name,
        });

        setShowPaymentDialog(false);
        setShowSuccessDialog(true);
        clearCart();
        return;
      }

      // Online mode
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

      const saleItems = cart.filter(item => !item.product.id.startsWith('quick_')).map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: Number(item.product.sale_price) * item.quantity,
      }));

      const quickItems = cart.filter(item => item.product.id.startsWith('quick_')).map(item => ({
        sale_id: sale.id,
        product_id: null,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        total_price: Number(item.product.sale_price) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert([...saleItems, ...quickItems]);

      if (itemsError) throw itemsError;

      // Update stock for real products only
      for (const item of cart.filter(i => !i.product.id.startsWith('quick_'))) {
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

      // Update cash register sales - use selected register
      if (selectedRegister) {
        const { data: register } = await supabase
          .from('cash_register')
          .select('*')
          .eq('id', selectedRegister)
          .single();

        if (register) {
          let updateFields: Record<string, number> = {};
          const saleTotal = total;

          if (paymentMethod === 'dinheiro') {
            updateFields = { cash_sales: (register.cash_sales || 0) + saleTotal };
          } else if (paymentMethod === 'pix') {
            updateFields = { pix_sales: (register.pix_sales || 0) + saleTotal };
          } else if (paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito') {
            updateFields = { card_sales: (register.card_sales || 0) + saleTotal };
          } else if (paymentMethod === 'dinheiro_cartao') {
            const cashPart = cashOrPixAmount;
            const cardPart = cardAmountValue;
            updateFields = {
              cash_sales: (register.cash_sales || 0) + cashPart,
              card_sales: (register.card_sales || 0) + cardPart,
            };
          } else if (paymentMethod === 'pix_cartao') {
            const pixPart = cashOrPixAmount;
            const cardPart = cardAmountValue;
            updateFields = {
              pix_sales: (register.pix_sales || 0) + pixPart,
              card_sales: (register.card_sales || 0) + cardPart,
            };
          }

          if (Object.keys(updateFields).length > 0) {
            await supabase
              .from('cash_register')
              .update(updateFields)
              .eq('id', register.id);
          }
        }
      }

      // Update discount usage count
      if (appliedDiscount) {
        await supabase
          .from('discounts')
          .update({ usage_count: (appliedDiscount as any).usage_count + 1 })
          .eq('id', appliedDiscount.id);
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

      const currentRegister = openRegisters.find(r => r.id === selectedRegister);
      
      setLastSale({
        id: sale.id,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.sale_price,
          total_price: Number(item.product.sale_price) * item.quantity,
        })),
        total,
        discount,
        payment_method: paymentMethod,
        created_at: sale.created_at,
        register_name: currentRegister?.register_name,
        operator_name: currentRegister?.operator_name,
      });

      setShowPaymentDialog(false);
      setShowSuccessDialog(true);
      clearCart();
      fetchProducts();
      
    } catch (error: any) {
      toast({ title: 'Erro ao processar venda', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!lastSale) return;
    const doc = generateReceiptPDF(lastSale);
    printPDF(doc);
  };

  const handleDownloadReceipt = () => {
    if (!lastSale) return;
    const doc = generateReceiptPDF(lastSale);
    downloadPDF(doc, `recibo_${lastSale.id.substring(0, 8)}.pdf`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calculatorButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', 'C'];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Products Section */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={techcontrolLogo} alt="TechControl" className="h-10 w-10 object-contain" />
                <div>
                  <h1 className="font-bold text-lg">TechControl PDV</h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>(11) 95661-4601</span>
                  </div>
                </div>
              </div>
              
              <OfflineIndicator
                isOnline={isOnline}
                pendingSalesCount={pendingSalesCount}
                lastSync={lastSync}
                onSync={syncPendingSales}
                syncing={syncing}
              />
            </div>

            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Buscar produto ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              
              <QuickActions
                onAddDiscount={() => setShowDiscountDialog(true)}
                onAddCustomer={() => navigate('/customers')}
                onQuickProduct={() => setShowQuickProductDialog(true)}
                onCalculator={() => setShowCalculatorDialog(true)}
                onChangeCalculator={() => setShowChangeCalculatorDialog(true)}
                onSalesHistory={() => setShowHistoryDialog(true)}
                onGenerateReceipt={handlePrintReceipt}
                onOpenReports={() => navigate('/reports')}
              />
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity <= 0}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1",
                    product.stock_quantity <= 0
                      ? "bg-muted opacity-60 cursor-not-allowed"
                      : "bg-card hover:bg-secondary/50"
                  )}
                >
                  {product.barcode && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Barcode className="h-3 w-3" />
                      <span>{product.barcode}</span>
                    </div>
                  )}
                  <p className="font-medium text-sm text-foreground line-clamp-2 mb-2">{product.name}</p>
                  <p className="text-xl font-bold text-primary font-mono">{formatCurrency(Number(product.sale_price))}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn(
                      "text-xs",
                      product.stock_quantity <= product.min_stock ? "text-destructive font-semibold" : "text-muted-foreground"
                    )}>
                      {product.stock_quantity} {product.unit || 'un'}
                    </span>
                    {product.stock_quantity <= product.min_stock && product.stock_quantity > 0 && (
                      <Badge variant="destructive" className="text-xs">Baixo</Badge>
                    )}
                  </div>
                </button>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum produto encontrado</p>
                  <p className="text-sm">Tente outro termo de busca</p>
                </div>
              )}
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
                {cart.length > 0 && (
                  <Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Cash Register Select */}
            <Select
              value={selectedRegister || 'none'}
              onValueChange={(value) => setSelectedRegister(value === 'none' ? null : value)}
            >
              <SelectTrigger className={cn("w-full", openRegisters.length === 0 && "border-destructive text-destructive")}>
                <Banknote className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecionar caixa" />
              </SelectTrigger>
              <SelectContent>
                {openRegisters.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum caixa aberto
                  </SelectItem>
                ) : (
                  openRegisters.map((register) => (
                    <SelectItem key={register.id} value={register.id}>
                      {register.register_name} {register.operator_name && `| ${register.operator_name}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {openRegisters.length === 0 && (
              <p className="text-xs text-destructive mt-1">Abra um caixa antes de vender</p>
            )}
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
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Desconto:</span>
              <div className="flex items-center gap-2">
                {appliedDiscount ? (
                  <Badge variant="secondary" className="text-xs">
                    {appliedDiscount.name}
                  </Badge>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowDiscountDialog(true)}
                    className="h-7"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {discount > 0 ? formatCurrency(discount) : 'Adicionar'}
                  </Button>
                )}
                {discount > 0 && (
                  <span className="text-sm font-mono text-destructive">-{formatCurrency(discount)}</span>
                )}
              </div>
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
              <div className="flex justify-between text-2xl font-bold pt-2 border-t border-border">
                <span>Total:</span>
                <span className="text-primary font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              variant="default"
              size="lg"
              className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              disabled={cart.length === 0 || openRegisters.length === 0 || !selectedRegister}
              onClick={() => setShowPaymentDialog(true)}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Finalizar Venda
            </Button>

            {/* WhatsApp Contact */}
            <div className="text-center pt-2">
              <a 
                href={WHATSAPP_URL}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-3 w-3" />
                TechControl: (11) 95661-4601
              </a>
            </div>
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'}
                onClick={() => { setPaymentMethod('dinheiro'); setCardAmount(''); }}
                className="flex-col h-auto py-3"
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs">Dinheiro</span>
              </Button>
              <Button
                variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                onClick={() => { setPaymentMethod('pix'); setCardAmount(''); }}
                className="flex-col h-auto py-3"
              >
                <Smartphone className="h-5 w-5 mb-1" />
                <span className="text-xs">PIX</span>
              </Button>
              <Button
                variant={paymentMethod === 'cartao_credito' ? 'default' : 'outline'}
                onClick={() => { setPaymentMethod('cartao_credito'); setCardAmount(''); setAmountReceived(''); }}
                className="flex-col h-auto py-3"
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs">Cartão</span>
              </Button>
              <Button
                variant={paymentMethod === 'outros' ? 'default' : 'outline'}
                onClick={() => { setPaymentMethod('outros'); setCardAmount(''); setAmountReceived(''); }}
                className="flex-col h-auto py-3"
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">Outros</span>
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowCalculatorDialog(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <span className="text-lg">🧮</span>
              <span>Calculadora</span>
            </Button>

            {paymentMethod === 'dinheiro' && (
              <>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="enableChange"
                    checked={enableChange}
                    onChange={(e) => setEnableChange(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="enableChange" className="text-sm cursor-pointer">
                    Calcular troco
                  </label>
                </div>

                {enableChange && (
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
                  </>
                )}
              </>
            )}


            {/* Change display for cash payments */}
            {enableChange && paymentMethod === 'dinheiro' && (
              <div className={`text-center p-3 rounded-lg ${
                change >= 0 
                  ? 'bg-green-500/10' 
                  : 'bg-destructive/10'
              }`}>
                <p className="text-sm text-muted-foreground">
                  {change >= 0 ? 'Troco' : 'Falta'}
                </p>
                <p className={`text-2xl font-bold font-mono ${
                  change >= 0 ? 'text-green-500' : 'text-destructive'
                }`}>
                  {change >= 0 ? '' : '-'}{formatCurrency(Math.abs(change))}
                </p>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className="space-y-4">
                {pixKey ? (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                      <QRCodeSVG 
                        value={generatePixPayload()} 
                        size={180}
                        level="H"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Chave PIX</p>
                      <p className="font-mono text-sm bg-secondary px-3 py-2 rounded">{pixKey}</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Valor a pagar</p>
                      <p className="text-3xl font-bold text-primary font-mono">{formatCurrency(total)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-warning/10 rounded-lg">
                    <QrCode className="h-12 w-12 mx-auto mb-2 text-warning" />
                    <p className="text-sm text-warning">Chave PIX não configurada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure sua chave PIX em Configurações → PIX
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => navigate('/settings')}
                    >
                      Ir para Configurações
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!isOnline && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
                Modo Offline: A venda será sincronizada quando a conexão for restaurada.
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading || (
                enableChange && 
                paymentMethod === 'dinheiro' && 
                change < 0
              )}
              className="bg-primary"
            >
              {loading ? 'Processando...' : paymentMethod === 'pix' ? 'Confirmar Pago' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Venda Realizada!</h2>
            <p className="text-muted-foreground mb-4">
              {!isOnline ? 'Venda salva para sincronização' : 'Venda registrada com sucesso'}
            </p>
            <p className="text-3xl font-bold text-primary font-mono mb-6">
              {formatCurrency(lastSale?.total || 0)}
            </p>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handlePrintReceipt}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={handleDownloadReceipt}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={() => setShowSuccessDialog(false)}>
                Nova Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aplicar Desconto Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {appliedDiscount && (
              <div className="p-3 bg-green-500/10 rounded-lg text-sm">
                <p className="font-medium text-green-600">Desconto automático aplicado:</p>
                <p>{appliedDiscount.name} - {formatCurrency(discount)}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant={discountType === 'value' ? 'default' : 'outline'}
                onClick={() => setDiscountType('value')}
                className="flex-1"
              >
                R$ Valor
              </Button>
              <Button
                variant={discountType === 'percent' ? 'default' : 'outline'}
                onClick={() => setDiscountType('percent')}
                className="flex-1"
              >
                % Porcentagem
              </Button>
            </div>
            <Input
              type="number"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder={discountType === 'value' ? 'Valor do desconto' : 'Porcentagem'}
              className="text-lg h-12 text-center"
            />
            {discountType === 'percent' && discountInput && (
              <p className="text-center text-muted-foreground">
                Desconto: {formatCurrency((subtotal * Number(discountInput)) / 100)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>Cancelar</Button>
            <Button onClick={applyManualDiscount}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Product Dialog */}
      <Dialog open={showQuickProductDialog} onOpenChange={setShowQuickProductDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Produto Avulso</DialogTitle>
            <DialogDescription>Adicione um produto que não está cadastrado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={quickProductName}
              onChange={(e) => setQuickProductName(e.target.value)}
              placeholder="Nome do produto"
            />
            <Input
              type="number"
              value={quickProductPrice}
              onChange={(e) => setQuickProductPrice(e.target.value)}
              placeholder="Preço"
              className="text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickProductDialog(false)}>Cancelar</Button>
            <Button onClick={addQuickProduct} disabled={!quickProductName || !quickProductPrice}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales History Dialog */}
      <SalesHistory open={showHistoryDialog} onOpenChange={setShowHistoryDialog} />

      {/* Calculator Dialog */}
      <CalculatorDialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog} />

      {/* Change Calculator Dialog */}
      <ChangeCalculatorDialog 
        open={showChangeCalculatorDialog} 
        onOpenChange={setShowChangeCalculatorDialog}
        total={total}
      />
    </AppLayout>
  );
}