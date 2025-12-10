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

export interface CartItem {
  product: Product;
  quantity: number;
}
