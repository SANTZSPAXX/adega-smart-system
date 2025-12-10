import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Store, User, Save, Loader2, MessageCircle, QrCode } from 'lucide-react';
import techcontrolLogo from '@/assets/techcontrol-logo.png';

const WHATSAPP_URL = "https://api.whatsapp.com/send/?phone=5511956614601";

interface CompanySettings {
  id?: string;
  user_id: string;
  company_name?: string;
  trade_name?: string;
  cnpj?: string;
  state_registration?: string;
  municipal_registration?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  tax_regime?: string;
  environment?: string;
  nfe_series?: number;
  nfce_series?: number;
  pix_key?: string;
}

export default function Settings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    email: ''
  });

  const [companyData, setCompanyData] = useState<Partial<CompanySettings>>({
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
    tax_regime: 'simples_nacional',
    environment: 'homologation',
    pix_key: ''
  });

  const [systemName, setSystemName] = useState('TechControl PDV');
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: (profile as any).phone || '',
        email: profile.email || ''
      });
    }
    fetchCompanySettings();
  }, [profile]);

  const fetchCompanySettings = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setCompanyData(data as CompanySettings);
      if (data.trade_name) {
        setSystemName(data.trade_name);
      }
      if ((data as any).pix_key) {
        setPixKey((data as any).pix_key);
      }
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone
      })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado!' });
    }
  };

  const saveCompanySettings = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        ...companyData,
        trade_name: systemName,
        pix_key: pixKey,
        user_id: user.id
      } as any, { onConflict: 'user_id' });

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configurações salvas!' });
    }
  };

  const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Perfil e configurações do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList>
            <TabsTrigger value="system"><Store className="h-4 w-4 mr-2" />Sistema</TabsTrigger>
            <TabsTrigger value="pix"><QrCode className="h-4 w-4 mr-2" />PIX</TabsTrigger>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Meu Perfil</TabsTrigger>
            <TabsTrigger value="company"><Store className="h-4 w-4 mr-2" />Dados da Empresa</TabsTrigger>
            <TabsTrigger value="fiscal"><SettingsIcon className="h-4 w-4 mr-2" />Configurações Fiscais</TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Personalize o nome exibido no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md">
                  <Label>Nome do Sistema (exibido no menu)</Label>
                  <Input 
                    value={systemName} 
                    onChange={e => setSystemName(e.target.value)} 
                    placeholder="TechControl PDV"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este nome será exibido no menu lateral do sistema
                  </p>
                </div>
                <Button onClick={saveCompanySettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pix">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Configuração PIX
                </CardTitle>
                <CardDescription>Configure sua chave PIX para receber pagamentos no PDV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-md">
                  <Label>Chave PIX</Label>
                  <Input 
                    value={pixKey} 
                    onChange={e => setPixKey(e.target.value)} 
                    placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta chave será usada para gerar o QR Code de pagamento no PDV
                  </p>
                </div>
                <Button onClick={saveCompanySettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Chave PIX
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Gerencie suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input 
                      value={profileData.full_name} 
                      onChange={e => setProfileData({...profileData, full_name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={profileData.email} disabled />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input 
                      value={profileData.phone} 
                      onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Perfil
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações para notas fiscais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Razão Social</Label>
                    <Input value={companyData.company_name || ''} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} />
                  </div>
                  <div>
                    <Label>Nome Fantasia</Label>
                    <Input value={systemName} onChange={e => setSystemName(e.target.value)} />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input value={companyData.cnpj || ''} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <Label>Inscrição Estadual</Label>
                    <Input value={companyData.state_registration || ''} onChange={e => setCompanyData({...companyData, state_registration: e.target.value})} />
                  </div>
                  <div>
                    <Label>Inscrição Municipal</Label>
                    <Input value={companyData.municipal_registration || ''} onChange={e => setCompanyData({...companyData, municipal_registration: e.target.value})} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={companyData.phone || ''} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Email</Label>
                    <Input type="email" value={companyData.email || ''} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input value={companyData.address || ''} onChange={e => setCompanyData({...companyData, address: e.target.value})} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={companyData.address_number || ''} onChange={e => setCompanyData({...companyData, address_number: e.target.value})} />
                    </div>
                    <div>
                      <Label>Bairro</Label>
                      <Input value={companyData.neighborhood || ''} onChange={e => setCompanyData({...companyData, neighborhood: e.target.value})} />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input value={companyData.city || ''} onChange={e => setCompanyData({...companyData, city: e.target.value})} />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select value={companyData.state || 'SP'} onValueChange={v => setCompanyData({...companyData, state: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>CEP</Label>
                      <Input value={companyData.zip_code || ''} onChange={e => setCompanyData({...companyData, zip_code: e.target.value})} placeholder="00000-000" />
                    </div>
                  </div>
                </div>

                <Button onClick={saveCompanySettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Empresa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiscal">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Fiscais</CardTitle>
                <CardDescription>Regime tributário e ambiente de emissão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Regime Tributário</Label>
                    <Select value={companyData.tax_regime || 'simples_nacional'} onValueChange={v => setCompanyData({...companyData, tax_regime: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ambiente</Label>
                    <Select value={companyData.environment || 'homologation'} onValueChange={v => setCompanyData({...companyData, environment: v as any})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologation">Homologação (Testes)</SelectItem>
                        <SelectItem value="production">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Série NF-e</Label>
                    <Input type="number" value={companyData.nfe_series || 1} onChange={e => setCompanyData({...companyData, nfe_series: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <Label>Série NFC-e</Label>
                    <Input type="number" value={companyData.nfce_series || 1} onChange={e => setCompanyData({...companyData, nfce_series: parseInt(e.target.value)})} />
                  </div>
                </div>

                <Button onClick={saveCompanySettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={techcontrolLogo} alt="TechControl" className="h-8" />
              <div>
                <p className="font-medium text-sm">Desenvolvido por TechControl</p>
                <a 
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-green-500 flex items-center gap-1"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp: (11) 95661-4601
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}