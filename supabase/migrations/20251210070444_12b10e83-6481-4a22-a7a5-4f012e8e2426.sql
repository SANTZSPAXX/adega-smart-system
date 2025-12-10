-- Add operator_name column to cash_register
ALTER TABLE public.cash_register 
ADD COLUMN IF NOT EXISTS register_name text DEFAULT 'Caixa 01',
ADD COLUMN IF NOT EXISTS operator_name text DEFAULT NULL;

-- Enable realtime for cash_register
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_register;