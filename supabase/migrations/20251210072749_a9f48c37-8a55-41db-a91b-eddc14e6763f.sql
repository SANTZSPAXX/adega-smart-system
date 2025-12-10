-- Add expiration_date column to products table
ALTER TABLE public.products 
ADD COLUMN expiration_date date;