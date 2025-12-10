-- Add image_url column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add profit_margin_percent column for automatic percentage-based pricing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC DEFAULT NULL;

-- Add profit_margin_value column for automatic fixed value-based pricing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS profit_margin_value NUMERIC DEFAULT NULL;