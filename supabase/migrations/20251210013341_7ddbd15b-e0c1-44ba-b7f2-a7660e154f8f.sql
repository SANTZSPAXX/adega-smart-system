-- Create invoices table for NFC-e/NF-e
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID REFERENCES public.sales(id),
  invoice_type TEXT NOT NULL DEFAULT 'nfce', -- 'nfce' or 'nfe'
  invoice_number INTEGER,
  series INTEGER DEFAULT 1,
  access_key TEXT, -- chave de acesso (44 dígitos)
  protocol_number TEXT, -- número do protocolo de autorização
  status TEXT DEFAULT 'pending', -- pending, authorized, cancelled, denied
  customer_name TEXT,
  customer_cpf TEXT,
  customer_cnpj TEXT,
  customer_address TEXT,
  total_products NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  total_invoice NUMERIC DEFAULT 0,
  ncm_code TEXT, -- NCM padrão
  cfop TEXT DEFAULT '5102', -- CFOP padrão venda consumidor
  icms_base NUMERIC DEFAULT 0,
  icms_value NUMERIC DEFAULT 0,
  icms_rate NUMERIC DEFAULT 0,
  pis_value NUMERIC DEFAULT 0,
  cofins_value NUMERIC DEFAULT 0,
  xml_content TEXT, -- XML da nota
  qrcode_url TEXT, -- URL do QRCode
  danfe_url TEXT, -- URL do DANFE
  authorization_date TIMESTAMP WITH TIME ZONE,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  ncm_code TEXT DEFAULT '22042100', -- NCM para vinhos
  cest_code TEXT, -- CEST code
  cfop TEXT DEFAULT '5102',
  unit TEXT DEFAULT 'UN',
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  icms_origin TEXT DEFAULT '0', -- 0 = Nacional
  icms_cst TEXT DEFAULT '00', -- CST ICMS
  icms_rate NUMERIC DEFAULT 0,
  pis_cst TEXT DEFAULT '01',
  pis_rate NUMERIC DEFAULT 0,
  cofins_cst TEXT DEFAULT '01',
  cofins_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create company settings table for fiscal data
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  trade_name TEXT, -- nome fantasia
  cnpj TEXT,
  state_registration TEXT, -- inscrição estadual
  municipal_registration TEXT, -- inscrição municipal
  address TEXT,
  address_number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT DEFAULT 'SP',
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  tax_regime TEXT DEFAULT 'simples_nacional', -- simples_nacional, lucro_presumido, lucro_real
  environment TEXT DEFAULT 'homologation', -- homologation or production
  nfce_series INTEGER DEFAULT 1,
  nfe_series INTEGER DEFAULT 1,
  last_nfce_number INTEGER DEFAULT 0,
  last_nfe_number INTEGER DEFAULT 0,
  certificate_password TEXT, -- encrypted password
  certificate_valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for invoice_items
CREATE POLICY "Users can view own invoice items" ON public.invoice_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own invoice items" ON public.invoice_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
  ));

-- RLS policies for company_settings
CREATE POLICY "Users can view own company settings" ON public.company_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company settings" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company settings" ON public.company_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Add NCM and CEST columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm_code TEXT DEFAULT '22042100';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cest_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102';

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();