
-- Add username and expiration fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add reseller role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Create discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  value numeric NOT NULL DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  max_discount numeric,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discounts" ON public.discounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own discounts" ON public.discounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own discounts" ON public.discounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own discounts" ON public.discounts FOR DELETE USING (auth.uid() = user_id);

-- Update profiles RLS to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
