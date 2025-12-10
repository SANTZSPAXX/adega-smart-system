import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Invoice, Sale, SaleItem, CompanySettings } from '@/types/database';
import { 
  FileText, 
  Search, 
  Plus, 
  Eye, 
  XCircle, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Building2,
  QrCode,
  Download,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SaleWithItems = Sale & { items: SaleItem[] };

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmitDialog, setShowEmitDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceType, setInvoiceType] = useState<'nfce' | 'nfe'>('nfce');
  const [customerCpf, setCustomerCpf] = useState('');

  // Company settings form
  const [settingsForm, setSettingsForm] = useState({
    company_name: '',
    trade_name: '',
    cnpj: '',
    state_registration: '',
    municipal_registration: '',
    address: '',
    address_number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    zip_code: '',
    phone: '',
    email: '',
    tax_regime: 'simples_nacional' as const,
    environment: 'homologation' as const,
  });

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchPendingSales();
      fetchCompanySettings();
    }
  }, [user]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
  };

  const fetchPendingSales = async () => {
    // Get sales that don't have invoices yet
    const { data: salesData } = await supabase
      .from('sales')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (salesData) {
      // Get items for each sale
      const salesWithItems = await Promise.all(
        salesData.map(async (sale) => {
          const { data: items } = await supabase
            .from('sale_items')
            .select('*')
            .eq('sale_id', sale.id);
          return { ...sale, items: items || [] } as SaleWithItems;
        })
      );

      // Filter out sales that already have invoices
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('sale_id')
        .not('sale_id', 'is', null);

      const invoicedSaleIds = new Set(existingInvoices?.map(i => i.sale_id) || []);
      const pendingSales = salesWithItems.filter(s => !invoicedSaleIds.has(s.id));
      setSales(pendingSales);
    }
  };

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .single();
    
    if (data) {
      setCompanySettings(data as CompanySettings);
      setSettingsForm({
        company_name: data.company_name || '',
        trade_name: data.trade_name || '',
        cnpj: data.cnpj || '',
        state_registration: data.state_registration || '',
        municipal_registration: data.municipal_registration || '',
        address: data.address || '',
        address_number: data.address_number || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || 'SP',
        zip_code: data.zip_code || '',
        phone: data.phone || '',
        email: data.email || '',
        tax_regime: data.tax_regime as 'simples_nacional',
        environment: data.environment as 'homologation',
      });
    }
  };

  const saveCompanySettings = async () => {
    setLoading(true);
    try {
      if (companySettings) {
        await supabase
          .from('company_settings')
          .update(settingsForm)
          .eq('id', companySettings.id);
      } else {
        await supabase
          .from('company_settings')
          .insert({ ...settingsForm, user_id: user!.id });
      }
      toast({ title: 'Configurações salvas!' });
      fetchCompanySettings();
      setShowSettingsDialog(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateAccessKey = () => {
    // Simplified access key generation (44 digits)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const uf = '35'; // SP
    const cnpj = (companySettings?.cnpj || '').replace(/\D/g, '').padStart(14, '0');
    const model = invoiceType === 'nfce' ? '65' : '55';
    const series = (invoiceType === 'nfce' ? companySettings?.nfce_series : companySettings?.nfe_series)?.toString().padStart(3, '0') || '001';
    const number = ((invoiceType === 'nfce' ? companySettings?.last_nfce_number : companySettings?.last_nfe_number) || 0 + 1).toString().padStart(9, '0');
    const emission = '1'; // Normal emission
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    const baseKey = `${uf}${year}${month}${cnpj}${model}${series}${number}${emission}${random}`;
    // Simplified check digit calculation
    const checkDigit = Math.floor(Math.random() * 10);
    
    return baseKey.slice(0, 43) + checkDigit;
  };

  const emitInvoice = async () => {
    if (!selectedSale) return;
    if (!companySettings?.cnpj) {
      toast({ title: 'Configure os dados da empresa primeiro', variant: 'destructive' });
      setShowSettingsDialog(true);
      return;
    }

    setLoading(true);
    try {
      const nextNumber = (invoiceType === 'nfce' 
        ? (companySettings?.last_nfce_number || 0) 
        : (companySettings?.last_nfe_number || 0)) + 1;

      const accessKey = generateAccessKey();
      
      // Calculate taxes (simplified - Simples Nacional)
      const totalProducts = selectedSale.items.reduce((sum, item) => sum + item.total_price, 0);
      const icmsRate = 0; // Simples Nacional usually has 0% ICMS for consumer
      const pisRate = 0.0065; // 0.65%
      const cofinsRate = 0.03; // 3%

      const icmsValue = totalProducts * icmsRate;
      const pisValue = totalProducts * pisRate;
      const cofinsValue = totalProducts * cofinsRate;

      // Create invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user!.id,
          sale_id: selectedSale.id,
          invoice_type: invoiceType,
          invoice_number: nextNumber,
          series: invoiceType === 'nfce' ? companySettings.nfce_series : companySettings.nfe_series,
          access_key: accessKey,
          status: companySettings.environment === 'homologation' ? 'authorized' : 'pending',
          customer_cpf: customerCpf.replace(/\D/g, '') || null,
          total_products: totalProducts,
          total_discount: selectedSale.discount || 0,
          total_invoice: selectedSale.total,
          cfop: '5102',
          icms_base: totalProducts,
          icms_value: icmsValue,
          icms_rate: icmsRate * 100,
          pis_value: pisValue,
          cofins_value: cofinsValue,
          protocol_number: companySettings.environment === 'homologation' 
            ? `HML${Date.now()}` 
            : null,
          authorization_date: companySettings.environment === 'homologation' 
            ? new Date().toISOString() 
            : null,
          qrcode_url: `https://nfce.fazenda.sp.gov.br/qrcode?chave=${accessKey}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Create invoice items
      const invoiceItems = selectedSale.items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: item.product_name,
        ncm_code: '22042100', // Default for wines
        cfop: '5102',
        unit: 'UN',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        icms_origin: '0',
        icms_cst: '00',
        icms_rate: 0,
        pis_cst: '01',
        pis_rate: pisRate * 100,
        cofins_cst: '01',
        cofins_rate: cofinsRate * 100,
      }));

      await supabase.from('invoice_items').insert(invoiceItems);

      // Update last invoice number
      await supabase
        .from('company_settings')
        .update({
          [invoiceType === 'nfce' ? 'last_nfce_number' : 'last_nfe_number']: nextNumber,
        })
        .eq('id', companySettings.id);

      toast({ 
        title: 'Nota Fiscal emitida!', 
        description: `${invoiceType.toUpperCase()} nº ${nextNumber} ${companySettings.environment === 'homologation' ? '(Homologação)' : ''}` 
      });

      setShowEmitDialog(false);
      setSelectedSale(null);
      setCustomerCpf('');
      fetchInvoices();
      fetchPendingSales();
      fetchCompanySettings();

    } catch (error: any) {
      toast({ title: 'Erro ao emitir nota', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const cancelInvoice = async (invoice: Invoice) => {
    if (!confirm('Deseja realmente cancelar esta nota fiscal?')) return;
    
    setLoading(true);
    try {
      await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          cancellation_date: new Date().toISOString(),
          cancellation_reason: 'Cancelamento solicitado pelo usuário',
        })
        .eq('id', invoice.id);

      toast({ title: 'Nota fiscal cancelada!' });
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      authorized: { label: 'Autorizada', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
      denied: { label: 'Rejeitada', variant: 'destructive' as const, icon: AlertCircle },
    };
    const style = styles[status as keyof typeof styles] || styles.pending;
    return (
      <Badge variant={style.variant} className="gap-1">
        <style.icon className="h-3 w-3" />
        {style.label}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.access_key?.includes(searchTerm) ||
    inv.customer_cpf?.includes(searchTerm)
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notas Fiscais</h1>
            <p className="text-muted-foreground">Emissão de NFC-e e NF-e</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Company Status */}
        {!companySettings?.cnpj && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Configure os dados da empresa</p>
                  <p className="text-sm text-muted-foreground">
                    Para emitir notas fiscais, é necessário configurar os dados fiscais da empresa.
                  </p>
                </div>
                <Button variant="outline" className="ml-auto" onClick={() => setShowSettingsDialog(true)}>
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {companySettings?.environment === 'homologation' && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-primary">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Ambiente de Homologação - Notas não têm validade fiscal</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices">Notas Emitidas</TabsTrigger>
            <TabsTrigger value="pending">Vendas Pendentes ({sales.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, chave de acesso ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          Nenhuma nota fiscal encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {invoice.invoice_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {invoice.invoice_number?.toString().padStart(9, '0')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {invoice.customer_cpf 
                              ? invoice.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                              : 'Consumidor Final'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(invoice.total_invoice)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {invoice.status === 'authorized' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => cancelInvoice(invoice)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          Todas as vendas já foram faturadas
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-xs">
                            #{sale.id.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{sale.items.length} itens</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sale.payment_method.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowEmitDialog(true);
                              }}
                              disabled={!companySettings?.cnpj}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Emitir NF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Emit Invoice Dialog */}
      <Dialog open={showEmitDialog} onOpenChange={setShowEmitDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Venda #{selectedSale.id.substring(0, 8)}</span>
                  <span className="font-bold text-primary font-mono">{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedSale.items.length} itens • {selectedSale.payment_method.replace('_', ' ')}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Nota</label>
                <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as 'nfce' | 'nfe')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfce">NFC-e (Consumidor Final)</SelectItem>
                    <SelectItem value="nfe">NF-e (Pessoa Jurídica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {invoiceType === 'nfce' ? 'CPF do Consumidor (opcional)' : 'CNPJ do Destinatário'}
                </label>
                <Input
                  placeholder={invoiceType === 'nfce' ? '000.000.000-00' : '00.000.000/0000-00'}
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(e.target.value)}
                />
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Série:</span>
                    <span className="ml-2 font-mono">
                      {invoiceType === 'nfce' ? companySettings?.nfce_series : companySettings?.nfe_series}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Próximo nº:</span>
                    <span className="ml-2 font-mono">
                      {((invoiceType === 'nfce' 
                        ? companySettings?.last_nfce_number 
                        : companySettings?.last_nfe_number) || 0) + 1}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ambiente:</span>
                    <Badge variant="outline" className="ml-2">
                      {companySettings?.environment === 'homologation' ? 'Homologação' : 'Produção'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmitDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={emitInvoice} disabled={loading}>
              <FileText className="h-4 w-4 mr-2" />
              {loading ? 'Emitindo...' : 'Emitir Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedInvoice?.invoice_type.toUpperCase()} nº {selectedInvoice?.invoice_number?.toString().padStart(9, '0')}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Data de Emissão</span>
                    <p className="font-medium">
                      {format(new Date(selectedInvoice.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedInvoice.authorization_date && (
                    <div>
                      <span className="text-sm text-muted-foreground">Data de Autorização</span>
                      <p className="font-medium">
                        {format(new Date(selectedInvoice.authorization_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Protocolo</span>
                    <p className="font-mono text-sm">{selectedInvoice.protocol_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Série</span>
                    <p className="font-mono">{selectedInvoice.series}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Chave de Acesso</span>
                <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                  {selectedInvoice.access_key}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Produtos</span>
                  <p className="font-bold font-mono">{formatCurrency(selectedInvoice.total_products)}</p>
                </div>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Desconto</span>
                  <p className="font-bold font-mono text-destructive">-{formatCurrency(selectedInvoice.total_discount)}</p>
                </div>
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <p className="font-bold font-mono text-primary text-lg">{formatCurrency(selectedInvoice.total_invoice)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ICMS</span>
                  <p className="font-mono">{formatCurrency(selectedInvoice.icms_value)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PIS</span>
                  <p className="font-mono">{formatCurrency(selectedInvoice.pis_value)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">COFINS</span>
                  <p className="font-mono">{formatCurrency(selectedInvoice.cofins_value)}</p>
                </div>
              </div>

              {selectedInvoice.qrcode_url && (
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">QR Code NFC-e</p>
                    <p className="text-sm text-muted-foreground">Escaneie para consultar a nota fiscal</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    DANFE
                  </Button>
                </div>
              )}

              {selectedInvoice.cancellation_date && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg">
                  <p className="font-medium text-destructive">Nota Cancelada</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedInvoice.cancellation_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {selectedInvoice.cancellation_reason && (
                    <p className="text-sm mt-1">{selectedInvoice.cancellation_reason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Configurações Fiscais
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Razão Social *</label>
                <Input
                  value={settingsForm.company_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, company_name: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome Fantasia</label>
                <Input
                  value={settingsForm.trade_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, trade_name: e.target.value })}
                  placeholder="Nome fantasia"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">CNPJ *</label>
                <Input
                  value={settingsForm.cnpj}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Inscrição Estadual</label>
                <Input
                  value={settingsForm.state_registration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, state_registration: e.target.value })}
                  placeholder="000.000.000.000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Inscrição Municipal</label>
                <Input
                  value={settingsForm.municipal_registration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, municipal_registration: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Endereço</label>
                <Input
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Número</label>
                <Input
                  value={settingsForm.address_number}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bairro</label>
                <Input
                  value={settingsForm.neighborhood}
                  onChange={(e) => setSettingsForm({ ...settingsForm, neighborhood: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Cidade</label>
                <Input
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">UF</label>
                <Select
                  value={settingsForm.state}
                  onValueChange={(v) => setSettingsForm({ ...settingsForm, state: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">CEP</label>
                <Input
                  value={settingsForm.zip_code}
                  onChange={(e) => setSettingsForm({ ...settingsForm, zip_code: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  type="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Regime Tributário</label>
                <Select
                  value={settingsForm.tax_regime}
                  onValueChange={(v) => setSettingsForm({ ...settingsForm, tax_regime: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ambiente</label>
                <Select
                  value={settingsForm.environment}
                  onValueChange={(v) => setSettingsForm({ ...settingsForm, environment: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologation">Homologação (Testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Certificado Digital</p>
              <p className="text-muted-foreground">
                Para emissão em ambiente de produção, será necessário configurar o certificado digital A1.
                Entre em contato com seu contador para obter o certificado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCompanySettings} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}