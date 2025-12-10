-- Add pix_key column to company_settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS pix_key text;