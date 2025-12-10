export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  barcode: string | null;
  description: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  is_active: boolean;
  ncm_code: string | null;
  cest_code: string | null;
  cfop: string | null;
  image_url: string | null;
  profit_margin_percent: number | null;
  profit_margin_value: number | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface StockMovement {
  id: string;
  user_id: string;
  product_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  address: string | null;
  loyalty_points: number;
  total_purchases: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  total: number;
  discount: number;
  payment_method: string;
  status: 'completed' | 'cancelled' | 'pending';
  notes: string | null;
  created_at: string;
  customer?: Customer;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CashRegister {
  id: string;
  user_id: string;
  opening_balance: number;
  closing_balance: number | null;
  cash_sales: number;
  card_sales: number;
  pix_sales: number;
  withdrawals: number;
  deposits: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export interface FinancialTransaction {
  id: string;
  user_id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  sale_id: string | null;
  invoice_type: 'nfce' | 'nfe';
  invoice_number: number | null;
  series: number;
  access_key: string | null;
  protocol_number: string | null;
  status: 'pending' | 'authorized' | 'cancelled' | 'denied';
  customer_name: string | null;
  customer_cpf: string | null;
  customer_cnpj: string | null;
  customer_address: string | null;
  total_products: number;
  total_discount: number;
  total_invoice: number;
  ncm_code: string | null;
  cfop: string;
  icms_base: number;
  icms_value: number;
  icms_rate: number;
  pis_value: number;
  cofins_value: number;
  xml_content: string | null;
  qrcode_url: string | null;
  danfe_url: string | null;
  authorization_date: string | null;
  cancellation_date: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  sale?: Sale;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  ncm_code: string;
  cest_code: string | null;
  cfop: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  icms_origin: string;
  icms_cst: string;
  icms_rate: number;
  pis_cst: string;
  pis_rate: number;
  cofins_cst: string;
  cofins_rate: number;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  user_id: string;
  company_name: string | null;
  trade_name: string | null;
  cnpj: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  tax_regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  environment: 'homologation' | 'production';
  nfce_series: number;
  nfe_series: number;
  last_nfce_number: number;
  last_nfe_number: number;
  certificate_password: string | null;
  certificate_valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}